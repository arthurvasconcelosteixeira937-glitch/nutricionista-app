// Utilidades de formato: moneda US$, fechas MM/DD/YYYY, teléfonos +1.
// Las fechas sin hora se manejan como texto "YYYY-MM-DD" para evitar
// problemas de zona horaria.

export const DEFAULT_TZ = "America/New_York";

export function toCents(value: number | string): number {
  return Math.round(Number(value) * 100);
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(value: number | string): string {
  return usd.format(fromCents(toCents(value)));
}

/** "2026-10-20" → "10/20/2026" */
export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.slice(0, 10).split("-");
  if (!y || !m || !d) return "";
  return `${m}/${d}/${y}`;
}

export function safeTimeZone(tz: string | null | undefined): string {
  if (!tz) return DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

/** Fecha de hoy ("YYYY-MM-DD") en la zona horaria indicada. */
export function todayInTz(tz?: string | null, now: Date = new Date()): string {
  return dateInTz(now, tz);
}

export function dateInTz(date: Date, tz?: string | null): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone(tz),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Fecha y hora "MM/DD/YYYY 3:45 PM" en la zona horaria del usuario. */
export function formatDateTime(iso: string, tz?: string | null): string {
  const d = new Date(iso);
  const date = formatDate(dateInTz(d, tz));
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone(tz),
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
  return `${date} ${time}`;
}

function toUTC(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Días entre dos fechas "YYYY-MM-DD" (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUTC(b) - toUTC(a)) / 86_400_000);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(toUTC(isoDate) + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function monthStart(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

export function monthEnd(isoMonth: string): string {
  const [y, m] = isoMonth.slice(0, 7).split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${isoMonth.slice(0, 7)}-${String(last).padStart(2, "0")}`;
}

export function shiftMonth(isoMonth: string, delta: number): string {
  const [y, m] = isoMonth.slice(0, 7).split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function monthLabel(isoMonth: string): string {
  const [y, m] = isoMonth.slice(0, 7).split("-").map(Number);
  const name = MONTHS_ES[m - 1] ?? "";
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}

// ---------- Teléfonos de EE. UU. ----------

/** Solo los 10 dígitos nacionales (quita +1 y símbolos). */
export function phoneDigits(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** Máscara mientras se escribe: (555) 123-4567 */
export function maskPhone(input: string): string {
  const d = phoneDigits(input);
  if (d.length === 0) return "";
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function isValidUSPhone(input: string): boolean {
  return /^[2-9]\d{9}$/.test(phoneDigits(input));
}

/** "(555) 123-4567" → "+15551234567" */
export function toE164(input: string): string {
  return `+1${phoneDigits(input)}`;
}

/** "+15551234567" → "+1 (555) 123-4567" */
export function formatPhone(e164: string): string {
  return `+1 ${maskPhone(e164)}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}
