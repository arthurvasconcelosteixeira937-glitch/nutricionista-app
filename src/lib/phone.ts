// Telefones do México: +52 seguido de 10 dígitos.

/**
 * Normaliza um telefone mexicano para E.164 (+52XXXXXXXXXX).
 * Aceita: "55 1234 5678", "+52 55 1234 5678", "52 1 55 1234 5678" (formato antigo com 1), etc.
 * Retorna null se não for válido.
 */
export function normalizeMxPhone(input: string): string | null {
  if (typeof input !== "string") return null;
  if (/[a-z]/i.test(input)) return null;
  let digits = input.replace(/\D/g, "");

  if (digits.length === 13 && digits.startsWith("521")) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith("52")) digits = digits.slice(2);
  else if (digits.length !== 10) return null;

  // Números mexicanos não começam com 0 nem 1 (o código de área começa em 2–9)
  if (!/^[2-9]\d{9}$/.test(digits)) return null;
  return `+52${digits}`;
}

export function isValidMxPhone(input: string): boolean {
  return normalizeMxPhone(input) !== null;
}

/** Só dígitos, para wa.me e para a WhatsApp Cloud API: "525512345678". */
export function phoneToWaDigits(e164: string): string {
  return e164.replace(/\D/g, "");
}

/** "+525512345678" → "55 1234 5678" */
export function formatMxPhone(e164: string): string {
  const d = e164.replace(/\D/g, "").slice(-10);
  return `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}`;
}
