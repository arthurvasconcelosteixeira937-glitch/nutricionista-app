import { daysBetween, timestampToLocalDate } from "./dates";

/**
 * Regra de atribuição explícita e única do produto:
 * um retorno só é atribuído à campanha quando
 *   1) a mensagem foi registrada como enviada (sent_at),
 *   2) o retorno foi registrado manualmente no contato da campanha, e
 *   3) a data do retorno está entre a data de envio e envio + janela de atribuição (dias).
 * Retornos fora da janela ficam registrados, mas não entram nas métricas atribuídas.
 */
export const ATTRIBUTION_RULE_TEXT =
  "Um retorno é atribuído à campanha somente quando foi registrado no contato da campanha, " +
  "depois do envio da mensagem e dentro da janela de atribuição definida na campanha. " +
  "Nenhuma venda é atribuída automaticamente.";

export interface AttributionInput {
  sentAt: string | null;
  returnedAt: string | null;
  windowDays: number;
}

export type AttributionStatus = "attributed" | "outside_window" | "not_returned";

export function attributionStatus(input: AttributionInput): AttributionStatus {
  if (!input.sentAt || !input.returnedAt) return "not_returned";
  const sentDate = timestampToLocalDate(input.sentAt);
  const diff = daysBetween(sentDate, input.returnedAt.slice(0, 10));
  if (diff < 0) return "outside_window";
  return diff <= input.windowDays ? "attributed" : "outside_window";
}
