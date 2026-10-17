// Núcleo do processamento de pagamentos — sem acesso direto a banco ou rede.
// Tudo entra por "deps", o que permite testar webhook, duplicados e assinatura.
//
// Regras críticas:
//  1. Assinatura x-signature inválida → 401, nada é processado.
//  2. O conteúdo do webhook NUNCA marca nada como pago: sempre buscamos o
//     pagamento na API do Mercado Pago com o token do vendedor.
//  3. Só status "approved" (com valor e moeda corretos) conta como pago.
//  4. Idempotente: o mesmo evento não é processado duas vezes e a transição
//     para "pagado" é condicional (só acontece uma vez → só 1 aviso).
import { decidePaymentAction } from "../cobro-status";
import { verifyMercadoPagoSignature } from "../mercadopago/signature";
import type { Cobro, MpPayment } from "../types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SellerAccount {
  sellerId: string;
  mpUserId: string;
}

export interface PaymentRepo {
  getCobro(id: string): Promise<Cobro | null>;
  upsertPayment(cobro: Cobro, payment: MpPayment): Promise<void>;
  /** Atualização CONDICIONAL: só muda se o cobro ainda não estiver pago. Retorna true se mudou agora. */
  markPaid(cobroId: string, payment: MpPayment): Promise<Cobro | null>;
  markRefunded(cobroId: string, paymentId: string): Promise<boolean>;
}

export interface PaymentNotifier {
  onPaymentConfirmed(cobro: Cobro): Promise<void>;
}

export type SyncResult =
  | "pagado"
  | "ya_pagado"
  | "reembolsado"
  | "registrado"
  | "rechazado"
  | "sin_referencia"
  | "cobro_no_encontrado";

/** Aplica um pagamento JÁ CONSULTADO na API do Mercado Pago ao cobro correspondente. */
export async function syncPayment(
  deps: { repo: PaymentRepo; notifier: PaymentNotifier; log?: (msg: string, extra?: unknown) => void },
  payment: MpPayment,
  account: SellerAccount,
): Promise<SyncResult> {
  const ref = payment.external_reference ?? "";
  if (!UUID_RE.test(ref)) return "sin_referencia";

  const cobro = await deps.repo.getCobro(ref);
  if (!cobro || cobro.seller_id !== account.sellerId) return "cobro_no_encontrado";

  const decision = decidePaymentAction(payment, cobro, account.mpUserId);
  if (decision.action === "reject") {
    deps.log?.("[pagos] pago rechazado por validación", { cobro: cobro.id, payment: payment.id, reason: decision.reason });
    return "rechazado";
  }

  await deps.repo.upsertPayment(cobro, payment);

  if (decision.action === "mark_paid") {
    const updated = await deps.repo.markPaid(cobro.id, payment);
    if (!updated) return "ya_pagado"; // outra execução concorrente já marcou
    try {
      await deps.notifier.onPaymentConfirmed(updated);
    } catch (e) {
      // Falha no aviso não pode desfazer o pagamento confirmado.
      deps.log?.("[pagos] fallo al notificar", { cobro: cobro.id, error: String(e) });
    }
    return "pagado";
  }

  if (decision.action === "mark_refunded") {
    await deps.repo.markRefunded(cobro.id, String(payment.id));
    return "reembolsado";
  }

  return decision.reason === "ya estaba pagado" ? "ya_pagado" : "registrado";
}

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

export interface WebhookDeps {
  secret: string | undefined;
  /** Registra o evento. Retorna "duplicate" se a chave já existir. */
  recordEvent(key: string, meta: { topic: string; dataId: string }): Promise<"new" | "duplicate">;
  /** Remove o registro (para o Mercado Pago poder reenviar depois de um erro temporário). */
  forgetEvent(key: string): Promise<void>;
  setEventResult(key: string, result: string): Promise<void>;
  findAccountByMpUserId(mpUserId: string): Promise<SellerAccount | null>;
  /** Consulta o pagamento na API do Mercado Pago com o token do vendedor. null = não existe nessa conta. */
  fetchPayment(account: SellerAccount, paymentId: string): Promise<MpPayment | null>;
  sync(payment: MpPayment, account: SellerAccount): Promise<SyncResult>;
  log?: (msg: string, extra?: unknown) => void;
}

export interface WebhookRequest {
  url: string;
  headers: { get(name: string): string | null };
  bodyText: string;
}

export interface WebhookResponse {
  status: number;
  body: { ok: boolean; result: string };
}

export async function handleMercadoPagoWebhook(deps: WebhookDeps, req: WebhookRequest): Promise<WebhookResponse> {
  const url = new URL(req.url);
  let body: { type?: string; action?: string; user_id?: number | string; data?: { id?: string | number } } = {};
  try {
    body = req.bodyText ? JSON.parse(req.bodyText) : {};
  } catch {
    body = {};
  }

  const queryDataId = url.searchParams.get("data.id");
  const dataId = queryDataId ?? (body.data?.id !== undefined ? String(body.data.id) : null);
  const topic = url.searchParams.get("type") ?? body.type ?? url.searchParams.get("topic") ?? "";

  // 1) Assinatura
  if (!deps.secret) {
    deps.log?.("[webhook] MP_WEBHOOK_SECRET no configurado");
    return { status: 500, body: { ok: false, result: "webhook_no_configurado" } };
  }
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");
  const valid = verifyMercadoPagoSignature({ xSignature, xRequestId, dataId: queryDataId ?? dataId, secret: deps.secret });
  if (!valid) return { status: 401, body: { ok: false, result: "firma_invalida" } };

  // 2) Só nos interessam pagamentos
  if (topic !== "payment" || !dataId || !/^\d{1,20}$/.test(dataId)) {
    return { status: 200, body: { ok: true, result: "ignorado" } };
  }

  // 3) Idempotência
  const ts = (xSignature ?? "").match(/ts=([^,]+)/)?.[1] ?? "";
  const key = xRequestId ? `req:${xRequestId}` : `pay:${dataId}:${body.action ?? ""}:${ts}`;
  if ((await deps.recordEvent(key, { topic, dataId })) === "duplicate") {
    return { status: 200, body: { ok: true, result: "duplicado" } };
  }

  try {
    const mpUserId = body.user_id !== undefined ? String(body.user_id) : "";
    const account = mpUserId ? await deps.findAccountByMpUserId(mpUserId) : null;
    if (!account) {
      await deps.setEventResult(key, "cuenta_desconocida");
      return { status: 200, body: { ok: true, result: "cuenta_desconocida" } };
    }

    // 4) Fonte da verdade: API do Mercado Pago
    const payment = await deps.fetchPayment(account, dataId);
    if (!payment) {
      await deps.setEventResult(key, "pago_no_encontrado");
      return { status: 200, body: { ok: true, result: "pago_no_encontrado" } };
    }

    const result = await deps.sync(payment, account);
    await deps.setEventResult(key, result);
    return { status: 200, body: { ok: true, result } };
  } catch (e) {
    // Erro temporário (ex.: API do MP fora do ar): liberamos a chave e pedimos reenvio.
    deps.log?.("[webhook] error procesando", { dataId, error: String(e) });
    await deps.forgetEvent(key).catch(() => {});
    return { status: 500, body: { ok: false, result: "error_temporal" } };
  }
}
