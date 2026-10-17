import { randomBytes } from "node:crypto";

// Alfabeto sem caracteres confusos (sem 0/O, 1/l/I).
const ALPHABET = "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Código público aleatório para /p/[code] e /v/[code].
 * 18 caracteres de um alfabeto de 57 ≈ 105 bits de entropia — impossível de adivinhar.
 * Usa rejection sampling para não ter viés.
 */
export function generatePublicCode(length = 18): string {
  const out: string[] = [];
  const max = 256 - (256 % ALPHABET.length);
  while (out.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte < max) out.push(ALPHABET[byte % ALPHABET.length]);
      if (out.length === length) break;
    }
  }
  return out.join("");
}

export function isPlausiblePublicCode(code: string): boolean {
  return /^[2-9a-km-zA-HJ-NP-Z]{18}$/.test(code);
}
