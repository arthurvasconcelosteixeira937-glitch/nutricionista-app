import "server-only";
import { env } from "./env";
import { formatMXN } from "./format";
import { getMessagingProvider, type MessageKind, type OutgoingMessage, type SendResult } from "./messaging";
import { createAdminClient } from "./supabase/admin";
import type { Cobro } from "./types";

export const payUrl = (code: string) => `${env.appUrl()}/p/${code}`;
export const verifyUrl = (code: string) => `${env.appUrl()}/v/${code}`;

/** Monta a mensagem (parâmetros na ordem do template) para cada tipo. */
export function buildMessage(kind: MessageKind, cobro: Cobro, businessName: string, sellerPhone?: string | null): OutgoingMessage {
  const amount = formatMXN(cobro.paid_amount ?? cobro.amount);
  switch (kind) {
    case "cobro_nuevo":
      return {
        kind,
        to: cobro.customer_phone,
        params: [cobro.customer_name, businessName, formatMXN(cobro.amount), cobro.description, payUrl(cobro.public_code)],
      };
    case "recordatorio":
      return {
        kind,
        to: cobro.customer_phone,
        params: [cobro.customer_name, formatMXN(cobro.amount), businessName, cobro.description, payUrl(cobro.public_code)],
      };
    case "recibo_cliente":
      return {
        kind,
        to: cobro.customer_phone,
        params: [
          cobro.customer_name,
          businessName,
          amount,
          cobro.description,
          cobro.mp_payment_id ?? "-",
          verifyUrl(cobro.public_code),
        ],
      };
    case "pago_confirmado_vendedor":
      return {
        kind,
        to: sellerPhone ?? "",
        params: [amount, cobro.customer_name, cobro.description, verifyUrl(cobro.public_code)],
      };
  }
}

/** Envia (ou gera link manual) e registra no message_log. */
export async function sendAndLog(msg: OutgoingMessage, ctx: { sellerId: string; cobroId: string }): Promise<SendResult> {
  const result = await getMessagingProvider().send(msg);
  await createAdminClient()
    .from("message_log")
    .insert({
      seller_id: ctx.sellerId,
      cobro_id: ctx.cobroId,
      kind: msg.kind,
      channel: result.channel,
      to_phone: msg.to,
      status: result.status,
      provider_message_id: result.status === "sent" ? (result.providerMessageId ?? null) : null,
      error: result.status === "failed" ? result.error.slice(0, 500) : null,
    })
    .then(({ error }) => error && console.error("[message_log]", error.message));
  return result;
}
