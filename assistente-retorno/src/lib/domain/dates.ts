export const TIME_ZONE = "America/Sao_Paulo";
const DAY_MS = 86_400_000;

/** Data de hoje (YYYY-MM-DD) no fuso de São Paulo. */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function nowTimestamp(): string {
  return new Date().toISOString();
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function toUTC(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Dias inteiros de `from` até `to` (positivo se `to` for depois). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUTC(to) - toUTC(from)) / DAY_MS);
}

export function addDays(iso: string, days: number): string {
  return new Date(toUTC(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Converte um timestamp ISO para a data local (São Paulo). */
export function timestampToLocalDate(ts: string): string {
  return todayISO(new Date(ts));
}

/**
 * Aceita datas como 31/12/2025, 31/12/25, 31-12-2025, 31.12.2025 e 2025-12-31.
 * Retorna YYYY-MM-DD ou null se inválida.
 */
export function parseFlexibleDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  if (iso) {
    const out = `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
    return isValidISODate(out) ? out : null;
  }
  const br = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(value);
  if (br) {
    let year = br[3];
    if (year.length === 2) year = (Number(year) > 50 ? "19" : "20") + year;
    const out = `${year}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
    return isValidISODate(out) ? out : null;
  }
  return null;
}

export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function formatDateTimeBR(ts: string | null | undefined): string {
  if (!ts) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(ts));
}
