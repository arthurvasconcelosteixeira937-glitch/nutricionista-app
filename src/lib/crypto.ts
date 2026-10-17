import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Criptografia dos tokens do Mercado Pago com AES-256-GCM.
// Formato salvo no banco: "v1.<iv>.<tag>.<ciphertext>" (base64url).

function loadKey(rawKey: string): Buffer {
  const key = Buffer.from(rawKey, "base64");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY deve ter 32 bytes em base64 (gere com: openssl rand -base64 32).");
  }
  return key;
}

export function encryptSecret(plain: string, rawKey: string): string {
  const key = loadKey(rawKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(".");
}

export function decryptSecret(payload: string, rawKey: string): string {
  const [version, iv, tag, ct] = payload.split(".");
  if (version !== "v1" || !iv || !tag || !ct) throw new Error("Formato de segredo inválido");
  const decipher = createDecipheriv("aes-256-gcm", loadKey(rawKey), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
}
