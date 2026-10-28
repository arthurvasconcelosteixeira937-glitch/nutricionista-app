/**
 * Normaliza telefones brasileiros para E.164 (+55DDNNNNNNNNN).
 * Aceita formatos como "(11) 98765-4321", "11987654321", "+55 11 98765-4321", "011 98765 4321".
 */
export function normalizeBrazilPhone(raw: string): string | null {
  // "(01) ..." é DDD inválido, não prefixo de operadora como em "(011) ...".
  if (/\(\s*0\d\s*\)/.test(raw)) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("0") && (digits.length === 11 || digits.length === 12)) {
    digits = digits.slice(1);
  }
  if (digits.length !== 10 && digits.length !== 11) return null;
  const ddd = digits.slice(0, 2);
  if (ddd[0] === "0" || ddd[1] === "0") return null;
  const number = digits.slice(2);
  if (digits.length === 11 && number[0] !== "9") return null; // celular tem 9 dígitos começando com 9
  if (digits.length === 10 && !/^[2-8]/.test(number)) return null; // fixo
  return `+55${digits}`;
}

export function formatPhoneBR(e164: string): string {
  const d = e164.replace(/^\+55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return e164;
}

export function isMobile(e164: string): boolean {
  return e164.replace(/^\+55/, "").length === 11;
}
