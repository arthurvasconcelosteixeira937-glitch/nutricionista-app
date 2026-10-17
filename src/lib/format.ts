// Formatação para o México (es-MX). Pode ser usado no cliente e no servidor.
import { MX_TZ } from "./time";

const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1250 → "$1,250.00 MXN" */
export function formatMXN(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return `${mxn.format(Number.isFinite(n) ? n : 0)} MXN`;
}

export function formatDateMX(date: Date | string, withTime = false): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: MX_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(d);
}

/**
 * Converte o texto digitado pelo vendedor em valor numérico.
 * Aceita "1250", "1,250.50", "$1,250.50", "1250.5". Rejeita mais de 2 decimais.
 */
export function parseAmountInput(input: string): number | null {
  const cleaned = input.replace(/[\s$]/g, "").replace(/MXN/i, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 1 || n > 999999.99) return null;
  return Math.round(n * 100) / 100;
}
