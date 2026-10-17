// Regras de status do cobro. Lógica pura, sem I/O — coberta por testes.
import type { Cobro, CobroStatus, MpPayment } from "./types";

/** O único status do Mercado Pago que significa "o dinheiro caiu". */
export const APPROVED = "approved";
const REVERSED = new Set(["refunded", "charged_back"]);

export const STATUS_LABEL: Record<CobroStatus, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado ✅",
  vencido: "Vencido",
  cancelado: "Cancelado",
  reembolsado: "Reembolsado",
};

/** Um cobro pendente cujo vencimento já passou é exibido como "vencido". */
export function effectiveStatus(cobro: Pick<Cobro, "status" | "due_at">, now = new Date()): CobroStatus {
  if (cobro.status === "pendiente" && cobro.due_at && new Date(cobro.due_at).getTime() < now.getTime()) {
    return "vencido";
  }
  return cobro.status;
}

export type PaymentDecision =
  | { action: "mark_paid"; reason: string }
  | { action: "mark_refunded"; reason: string }
  | { action: "record_only"; reason: string }
  | { action: "reject"; reason: string };

/**
 * Decide o que fazer com um pagamento que JÁ FOI consultado na API do Mercado Pago.
 * Nunca deve ser chamada com dados vindos só do webhook.
 */
export function decidePaymentAction(
  payment: MpPayment,
  cobro: Pick<Cobro, "id" | "amount" | "currency" | "status" | "mp_payment_id">,
  sellerMpUserId: string,
): PaymentDecision {
  if (payment.external_reference !== cobro.id) {
    return { action: "reject", reason: "external_reference no coincide" };
  }
  if (payment.collector_id !== undefined && String(payment.collector_id) !== String(sellerMpUserId)) {
    return { action: "reject", reason: "el pago pertenece a otra cuenta" };
  }

  if (payment.status === APPROVED) {
    if (payment.currency_id !== "MXN") return { action: "reject", reason: "moneda distinta de MXN" };
    const expected = Math.round(Number(cobro.amount) * 100);
    const received = Math.round(Number(payment.transaction_amount) * 100);
    if (!Number.isFinite(received) || received < expected) {
      return { action: "reject", reason: "monto pagado menor al cobro" };
    }
    if (cobro.status === "pagado") return { action: "record_only", reason: "ya estaba pagado" };
    if (cobro.status === "reembolsado") return { action: "record_only", reason: "cobro reembolsado" };
    return { action: "mark_paid", reason: "pago aprobado" };
  }

  if (REVERSED.has(payment.status)) {
    if (cobro.status === "pagado" && cobro.mp_payment_id === String(payment.id)) {
      return { action: "mark_refunded", reason: `pago ${payment.status}` };
    }
    return { action: "record_only", reason: `pago ${payment.status}` };
  }

  // pending (OXXO/SPEI esperando), in_process, authorized, rejected, cancelled...
  return { action: "record_only", reason: `estado ${payment.status}` };
}

/** Estados a partir dos quais um cobro pode virar "pagado". */
export const PAYABLE_FROM: CobroStatus[] = ["pendiente", "vencido", "cancelado"];

/** Status de pagamento do Mercado Pago em espanhol (para exibir). */
export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  approved: "Aprobado ✅",
  pending: "Esperando pago",
  in_process: "En revisión",
  authorized: "Autorizado (sin cobrar)",
  in_mediation: "En disputa",
  rejected: "Rechazado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  charged_back: "Contracargo",
};
