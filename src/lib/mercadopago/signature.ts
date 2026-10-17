// Validação da assinatura x-signature dos webhooks do Mercado Pago.
// Doc: "Validar origen de la notificación" (Tus integraciones → Webhooks → clave secreta).
//
// Header x-signature: "ts=1704908010,v1=618c85345248dd820d5fd456117c2ab2ef8eda45a0282ff693eac24131a5e839"
// Manifest:           "id:[data.id da URL];request-id:[x-request-id];ts:[ts];"
// Assinatura:         HMAC-SHA256(manifest, chave secreta) em hexadecimal == v1
// Se data.id for alfanumérico, deve ir em minúsculas. Partes ausentes são omitidas.
import { createHmac, timingSafeEqual } from "node:crypto";

export function parseSignatureHeader(header: string | null): { ts?: string; v1?: string } {
  const out: { ts?: string; v1?: string } = {};
  if (!header) return out;
  for (const part of header.split(",")) {
    const [rawKey, ...rest] = part.split("=");
    const key = rawKey?.trim();
    const value = rest.join("=").trim();
    if (key === "ts") out.ts = value;
    if (key === "v1") out.v1 = value;
  }
  return out;
}

export function buildManifest(dataId: string | null, requestId: string | null, ts: string): string {
  let manifest = "";
  if (dataId) manifest += `id:${/[a-z]/i.test(dataId) ? dataId.toLowerCase() : dataId};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;
  return manifest;
}

export function verifyMercadoPagoSignature(input: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
}): boolean {
  const { ts, v1 } = parseSignatureHeader(input.xSignature);
  if (!ts || !v1 || !input.secret) return false;
  if (!/^[0-9a-f]{64}$/i.test(v1)) return false;

  const expected = createHmac("sha256", input.secret)
    .update(buildManifest(input.dataId, input.xRequestId, ts))
    .digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1.toLowerCase(), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
