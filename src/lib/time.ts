// Utilitários de data/hora no fuso de America/Mexico_City.
// Não dependemos do fuso do servidor (a Vercel roda em UTC).

export const MX_TZ = "America/Mexico_City";

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

export function mxParts(date: Date): Parts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: MX_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, number> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") p[part.type] = Number(part.value);
  }
  return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute, second: p.second };
}

/** Diferença (em minutos) entre o horário do México e UTC naquele instante. Ex.: -360. */
export function mxOffsetMinutes(date: Date): number {
  const p = mxParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/** Hora (0–23) no México. */
export function mxHour(date: Date): number {
  return mxParts(date).hour;
}

/** Converte data/hora "de parede" do México para um Date (UTC). */
export function mxWallTimeToDate(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offset = mxOffsetMinutes(guess);
  const result = new Date(guess.getTime() - offset * 60000);
  // Corrige caso o offset mude exatamente na transição
  const offset2 = mxOffsetMinutes(result);
  return offset2 === offset ? result : new Date(guess.getTime() - offset2 * 60000);
}

export function startOfMxDay(date: Date): Date {
  const p = mxParts(date);
  return mxWallTimeToDate(p.year, p.month, p.day);
}

export function startOfMxMonth(date: Date): Date {
  const p = mxParts(date);
  return mxWallTimeToDate(p.year, p.month, 1);
}

/** "2026-10-20" (data no México) → fim do dia 23:59:59 no México. */
export function endOfMxDayFromIsoDate(isoDate: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = mxWallTimeToDate(y, mo, d, 23, 59, 59);
  const check = mxParts(date);
  if (check.year !== y || check.month !== mo || check.day !== d) return null; // ex.: 31/02
  return date;
}

/** Data de hoje no México no formato YYYY-MM-DD. */
export function todayMxIso(now = new Date()): string {
  const p = mxParts(now);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** ISO 8601 com offset do México, ex.: 2026-10-20T23:59:59.000-06:00 (formato aceito pelo Mercado Pago). */
export function toMxIsoWithOffset(date: Date): string {
  const p = mxParts(date);
  const off = mxOffsetMinutes(date);
  const sign = off <= 0 ? "-" : "+";
  const abs = Math.abs(off);
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  return (
    `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}.000` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}
