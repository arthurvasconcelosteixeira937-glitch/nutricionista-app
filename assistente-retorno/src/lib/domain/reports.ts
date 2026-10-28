import { attributionStatus } from "./attribution";

export interface MetricsContactRow {
  message_text: string | null;
  approved_at: string | null;
  sent_at: string | null;
  replied_at: string | null;
  scheduled_at: string | null;
  returned_at: string | null;
  revenue_cents: number | null;
  revenue_source: "manual" | "integration" | null;
  attribution_window_days: number;
}

export interface FunnelCounts {
  selected: number;
  prepared: number;
  approved: number;
  sent: number;
  replied: number;
  scheduled: number;
  returnedAttributed: number;
  returnedOutsideWindow: number;
  returnsWithRevenue: number;
  revenueManualCents: number;
  revenueIntegrationCents: number;
}

export function computeFunnel(rows: MetricsContactRow[]): FunnelCounts {
  const c: FunnelCounts = {
    selected: rows.length,
    prepared: 0,
    approved: 0,
    sent: 0,
    replied: 0,
    scheduled: 0,
    returnedAttributed: 0,
    returnedOutsideWindow: 0,
    returnsWithRevenue: 0,
    revenueManualCents: 0,
    revenueIntegrationCents: 0,
  };
  for (const r of rows) {
    if (r.message_text) c.prepared++;
    if (r.approved_at) c.approved++;
    if (!r.sent_at) continue;
    c.sent++;
    if (r.replied_at) c.replied++;
    if (r.scheduled_at) c.scheduled++;
    const status = attributionStatus({
      sentAt: r.sent_at,
      returnedAt: r.returned_at,
      windowDays: r.attribution_window_days,
    });
    if (status === "outside_window") c.returnedOutsideWindow++;
    if (status !== "attributed") continue;
    c.returnedAttributed++;
    if (r.revenue_cents != null) {
      c.returnsWithRevenue++;
      if (r.revenue_source === "integration") c.revenueIntegrationCents += r.revenue_cents;
      else c.revenueManualCents += r.revenue_cents;
    }
  }
  return c;
}

export const SMALL_SAMPLE_THRESHOLD = 20;

export interface Rate {
  label: string;
  numerator: number;
  denominator: number;
  numeratorLabel: string;
  denominatorLabel: string;
  /** null quando não há denominador: exibir "Sem dados suficientes". */
  value: number | null;
  smallSample: boolean;
}

export function rate(
  label: string,
  numerator: number,
  numeratorLabel: string,
  denominator: number,
  denominatorLabel: string,
): Rate {
  return {
    label,
    numerator,
    denominator,
    numeratorLabel,
    denominatorLabel,
    value: denominator > 0 ? numerator / denominator : null,
    smallSample: denominator > 0 && denominator < SMALL_SAMPLE_THRESHOLD,
  };
}

export function formatPercent(value: number | null): string {
  if (value == null) return "Sem dados suficientes";
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function funnelRates(c: FunnelCounts): Rate[] {
  return [
    rate("Taxa de resposta", c.replied, "respostas", c.sent, "mensagens enviadas"),
    rate("Taxa de agendamento", c.scheduled, "agendamentos", c.sent, "mensagens enviadas"),
    rate("Taxa de retorno atribuído", c.returnedAttributed, "retornos atribuídos", c.sent, "mensagens enviadas"),
  ];
}
