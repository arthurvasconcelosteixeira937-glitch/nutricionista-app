import "server-only";
// Implementação real (Supabase + Mercado Pago + WhatsApp) das dependências do núcleo.
import { env } from "../env";
import { getPayment, MercadoPagoError, searchPaymentsByExternalReference } from "../mercadopago/api";
import { getMpAccount, getMpAccountByMpUserId, getValidAccessToken } from "../mercadopago/tokens";
import { buildMessage, sendAndLog } from "../messages";
import { getMessagingProvider } from "../messaging";
import { createAdminClient } from "../supabase/admin";
import type { Cobro, MpPayment } from "../types";
import {
  handleMercadoPagoWebhook,
  syncPayment,
  type PaymentNotifier,
  type PaymentRepo,
  type SellerAccount,
  type SyncResult,
  type WebhookRequest,
} from "./core";

const log = (msg: string, extra?: unknown) => console.log(msg, extra ?? "");

export const supabaseRepo: PaymentRepo = {
  async getCobro(id) {
    const { data } = await createAdminClient().from("cobros").select("*").eq("id", id).maybeSingle();
    return (data as Cobro | null) ?? null;
  },

  async upsertPayment(cobro, p) {
    const { error } = await createAdminClient()
      .from("payments")
      .upsert(
        {
          cobro_id: cobro.id,
          seller_id: cobro.seller_id,
          mp_payment_id: String(p.id),
          status: p.status,
          status_detail: p.status_detail ?? null,
          payment_method_id: p.payment_method_id ?? null,
          payment_type_id: p.payment_type_id ?? null,
          amount: p.transaction_amount,
          currency: p.currency_id,
          live_mode: p.live_mode ?? null,
          date_approved: p.date_approved ?? null,
        },
        { onConflict: "mp_payment_id" },
      );
    if (error) throw new Error(`upsert payment: ${error.message}`);
  },

  async markPaid(cobroId, p) {
    // Update condicional: se dois webhooks chegarem juntos, só um "ganha".
    const { data, error } = await createAdminClient()
      .from("cobros")
      .update({
        status: "pagado",
        mp_payment_id: String(p.id),
        paid_amount: p.transaction_amount,
        paid_at: p.date_approved ?? new Date().toISOString(),
        payment_method: p.payment_method_id ?? null,
      })
      .eq("id", cobroId)
      .in("status", ["pendiente", "vencido", "cancelado"])
      .select("*");
    if (error) throw new Error(`markPaid: ${error.message}`);
    return ((data as Cobro[] | null) ?? [])[0] ?? null;
  },

  async markRefunded(cobroId, paymentId) {
    const { data, error } = await createAdminClient()
      .from("cobros")
      .update({ status: "reembolsado" })
      .eq("id", cobroId)
      .eq("status", "pagado")
      .eq("mp_payment_id", paymentId)
      .select("id");
    if (error) throw new Error(`markRefunded: ${error.message}`);
    return (data ?? []).length > 0;
  },
};

/** Avisa o vendedor e manda recibo ao cliente (no modo cloud_api). No modo manual, o painel mostra os botões. */
export const whatsappNotifier: PaymentNotifier = {
  async onPaymentConfirmed(cobro: Cobro) {
    if (getMessagingProvider().mode !== "cloud_api") return;
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("business_name, whatsapp")
      .eq("id", cobro.seller_id)
      .maybeSingle();
    const businessName = profile?.business_name ?? "Tu vendedor";
    const ctx = { sellerId: cobro.seller_id, cobroId: cobro.id };

    if (profile?.whatsapp) {
      const r = await sendAndLog(buildMessage("pago_confirmado_vendedor", cobro, businessName, profile.whatsapp), ctx);
      if (r.status === "sent") await admin.from("cobros").update({ seller_notified_at: new Date().toISOString() }).eq("id", cobro.id);
    }
    const r2 = await sendAndLog(buildMessage("recibo_cliente", cobro, businessName), ctx);
    if (r2.status === "sent") await admin.from("cobros").update({ receipt_sent_at: new Date().toISOString() }).eq("id", cobro.id);
  },
};

async function tokenFor(account: SellerAccount): Promise<string> {
  const row = await getMpAccount(account.sellerId);
  if (!row) throw new Error("cuenta MP no encontrada");
  return getValidAccessToken(row);
}

const sync = (payment: MpPayment, account: SellerAccount) =>
  syncPayment({ repo: supabaseRepo, notifier: whatsappNotifier, log }, payment, account);

export function processMercadoPagoWebhook(req: WebhookRequest) {
  const admin = createAdminClient();
  return handleMercadoPagoWebhook(
    {
      secret: env.mpWebhookSecret(),
      async recordEvent(key, meta) {
        const { error } = await admin
          .from("webhook_events")
          .insert({ provider: "mercadopago", event_key: key, topic: meta.topic, data_id: meta.dataId });
        if (!error) return "new";
        if (error.code === "23505") return "duplicate"; // unique_violation
        throw new Error(`webhook_events: ${error.message}`);
      },
      async forgetEvent(key) {
        await admin.from("webhook_events").delete().eq("provider", "mercadopago").eq("event_key", key);
      },
      async setEventResult(key, result) {
        await admin.from("webhook_events").update({ result }).eq("provider", "mercadopago").eq("event_key", key);
      },
      async findAccountByMpUserId(mpUserId) {
        const row = await getMpAccountByMpUserId(mpUserId);
        return row ? { sellerId: row.seller_id, mpUserId: row.mp_user_id } : null;
      },
      async fetchPayment(account, paymentId) {
        try {
          return await getPayment(await tokenFor(account), paymentId);
        } catch (e) {
          if (e instanceof MercadoPagoError && (e.status === 404 || e.status === 403)) return null;
          throw e;
        }
      },
      sync,
      log,
    },
    req,
  );
}

/**
 * Consulta o Mercado Pago pelos pagamentos de um cobro e aplica o resultado.
 * Usado pelo cron de segurança e quando alguém abre /p ou /v de um cobro pendente.
 */
export async function reconcileCobro(cobro: Cobro): Promise<SyncResult | "sin_pagos" | "sin_cuenta"> {
  const row = await getMpAccount(cobro.seller_id);
  if (!row) return "sin_cuenta";
  const token = await getValidAccessToken(row);
  const payments = await searchPaymentsByExternalReference(token, cobro.id);
  await createAdminClient().from("cobros").update({ last_checked_at: new Date().toISOString() }).eq("id", cobro.id);
  if (payments.length === 0) return "sin_pagos";

  const account = { sellerId: row.seller_id, mpUserId: row.mp_user_id };
  // Aprovados primeiro: se houver um pagamento aprovado, é ele que vale.
  const ordered = [...payments].sort((a, b) => Number(b.status === "approved") - Number(a.status === "approved"));
  let last: SyncResult = "registrado";
  for (const p of ordered) {
    last = await sync(p, account);
    if (last === "pagado" || last === "ya_pagado") break;
  }
  return last;
}
