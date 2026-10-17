import { describe, expect, it } from "vitest";
import { generatePublicCode, isPlausiblePublicCode } from "@/lib/codes";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { formatMXN, parseAmountInput } from "@/lib/format";
import { buildPreferenceBody } from "@/lib/mercadopago/api";
import { buildAuthorizationUrl, needsRefresh } from "@/lib/mercadopago/oauth";
import { buildManifest, verifyMercadoPagoSignature } from "@/lib/mercadopago/signature";
import { buildTemplatePayload } from "@/lib/messaging/cloud-api";
import { ManualMessagingProvider } from "@/lib/messaging/manual";
import { TEMPLATES, renderTemplate } from "@/lib/messaging/templates";
import { normalizeMxPhone } from "@/lib/phone";
import { endOfMxDayFromIsoDate, startOfMxDay, startOfMxMonth, toMxIsoWithOffset } from "@/lib/time";
import { SECRET, sign } from "./helpers";

describe("formato MXN", () => {
  it("formata em es-MX", () => {
    expect(formatMXN(1250)).toBe("$1,250.00 MXN");
    expect(formatMXN("99.5")).toBe("$99.50 MXN");
  });
  it("interpreta o valor digitado", () => {
    expect(parseAmountInput("1,250.50")).toBe(1250.5);
    expect(parseAmountInput("$300")).toBe(300);
    expect(parseAmountInput("12.345")).toBeNull();
    expect(parseAmountInput("0")).toBeNull();
    expect(parseAmountInput("abc")).toBeNull();
    expect(parseAmountInput("1000000")).toBeNull();
  });
});

describe("telefone do México", () => {
  it.each([
    ["55 1234 5678", "+525512345678"],
    ["+52 55 1234 5678", "+525512345678"],
    ["52 1 55 1234 5678", "+525512345678"],
    ["(33) 1234-5678", "+523312345678"],
  ])("%s → %s", (input, out) => expect(normalizeMxPhone(input)).toBe(out));

  it.each(["123", "0512345678", "+1 415 555 1234", "55 1234 567a", ""])("rejeita %s", (input) => {
    expect(normalizeMxPhone(input)).toBeNull();
  });
});

describe("códigos públicos", () => {
  it("são longos, válidos e diferentes", () => {
    const codes = new Set(Array.from({ length: 2000 }, () => generatePublicCode()));
    expect(codes.size).toBe(2000);
    for (const c of codes) expect(isPlausiblePublicCode(c)).toBe(true);
  });
});

describe("criptografia de tokens", () => {
  const key = Buffer.alloc(32, 7).toString("base64");
  it("ida e volta", () => {
    const enc = encryptSecret("APP_USR-123", key);
    expect(enc).not.toContain("APP_USR");
    expect(decryptSecret(enc, key)).toBe("APP_USR-123");
  });
  it("falha com chave errada ou adulteração", () => {
    const enc = encryptSecret("segredo", key);
    expect(() => decryptSecret(enc, Buffer.alloc(32, 8).toString("base64"))).toThrow();
    const parts = enc.split(".");
    parts[3] = Buffer.from("xxxx").toString("base64url");
    expect(() => decryptSecret(parts.join("."), key)).toThrow();
  });
  it("exige chave de 32 bytes", () => {
    expect(() => encryptSecret("x", "curta")).toThrow();
  });
});

describe("assinatura do webhook", () => {
  it("manifest segue a documentação e põe id alfanumérico em minúsculas", () => {
    expect(buildManifest("123", "abc", "1")).toBe("id:123;request-id:abc;ts:1;");
    expect(buildManifest("ABC1", null, "1")).toBe("id:abc1;ts:1;");
  });
  it("valida e rejeita", () => {
    expect(verifyMercadoPagoSignature({ xSignature: sign("1", "r"), xRequestId: "r", dataId: "1", secret: SECRET })).toBe(true);
    expect(verifyMercadoPagoSignature({ xSignature: sign("1", "r"), xRequestId: "outro", dataId: "1", secret: SECRET })).toBe(false);
    expect(verifyMercadoPagoSignature({ xSignature: "ts=1,v1=zz", xRequestId: "r", dataId: "1", secret: SECRET })).toBe(false);
    expect(verifyMercadoPagoSignature({ xSignature: null, xRequestId: "r", dataId: "1", secret: SECRET })).toBe(false);
  });
  it("aceita espaços no header", () => {
    const s = sign("1", "r").replace(",", ", ");
    expect(verifyMercadoPagoSignature({ xSignature: s, xRequestId: "r", dataId: "1", secret: SECRET })).toBe(true);
  });
});

describe("Mercado Pago", () => {
  it("preferência usa external_reference = id do cobro e não exclui OXXO/SPEI", () => {
    const body = buildPreferenceBody({
      cobroId: "c1",
      publicCode: "code",
      title: "Blusa",
      amount: 100,
      appUrl: "https://cobroseguro.mx",
    });
    expect(body.external_reference).toBe("c1");
    expect(body.items[0].currency_id).toBe("MXN");
    expect(body.payment_methods.excluded_payment_types).toEqual([]);
    expect(body.notification_url).toBe("https://cobroseguro.mx/api/webhooks/mercadopago?source_news=webhooks");
    expect(body.auto_return).toBe("approved");
  });
  it("em http (local) não envia notification_url nem auto_return", () => {
    const body = buildPreferenceBody({ cobroId: "c1", publicCode: "x", title: "t", amount: 1, appUrl: "http://localhost:3000" });
    expect("notification_url" in body).toBe(false);
    expect("auto_return" in body).toBe(false);
  });
  it("URL de autorização", () => {
    const url = new URL(
      buildAuthorizationUrl(
        { clientId: "1", clientSecret: "s", redirectUri: "https://x/cb", authUrl: "https://auth.mercadopago.com.mx/authorization" },
        "st",
      ),
    );
    expect(url.searchParams.get("state")).toBe("st");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("redirect_uri")).toBe("https://x/cb");
  });
  it("renova token quando faltam menos de 30 dias", () => {
    const now = new Date("2026-10-10T00:00:00Z");
    expect(needsRefresh("2026-10-30T00:00:00Z", now)).toBe(true);
    expect(needsRefresh("2027-01-30T00:00:00Z", now)).toBe(false);
  });
});

describe("horário do México", () => {
  it("início do dia e do mês", () => {
    const now = new Date("2026-10-10T03:00:00Z"); // 9/out 21:00 no México
    expect(startOfMxDay(now).toISOString()).toBe("2026-10-09T06:00:00.000Z");
    expect(startOfMxMonth(now).toISOString()).toBe("2026-10-01T06:00:00.000Z");
  });
  it("fim do dia de vencimento e formato com offset", () => {
    const d = endOfMxDayFromIsoDate("2026-10-20")!;
    expect(d.toISOString()).toBe("2026-10-21T05:59:59.000Z");
    expect(toMxIsoWithOffset(d)).toBe("2026-10-20T23:59:59.000-06:00");
    expect(endOfMxDayFromIsoDate("2026-02-31")).toBeNull();
  });
});

describe("mensagens de WhatsApp", () => {
  it("templates não começam nem terminam com variável (regra da Meta)", () => {
    for (const t of Object.values(TEMPLATES)) {
      expect(t.body.trim().startsWith("{{")).toBe(false);
      expect(t.body.trim().endsWith("}}")).toBe(false);
      const count = new Set(t.body.match(/\{\{\d+\}\}/g)).size;
      expect(count).toBe(t.vars.length);
      expect(t.example.length).toBe(t.vars.length);
    }
  });
  it("texto do vendedor pago", () => {
    const text = renderTemplate("pago_confirmado_vendedor", ["$1,250.00 MXN", "Ana", "Blusa", "https://x/v/1"]);
    expect(text).toContain("✅ Pago confirmado de $1,250.00 MXN de Ana. Ya puedes entregar.");
  });
  it("modo manual gera link wa.me", async () => {
    const r = await new ManualMessagingProvider().send({
      kind: "cobro_nuevo",
      to: "+525512345678",
      params: ["Ana", "Tienda", "$1.00 MXN", "x", "https://x/p/1"],
    });
    expect(r.status).toBe("manual_link");
    if (r.status === "manual_link") expect(r.waLink.startsWith("https://wa.me/525512345678?text=Hola%20Ana")).toBe(true);
  });
  it("payload da Cloud API usa template e remove quebras de linha dos parâmetros", () => {
    const p = buildTemplatePayload(
      { kind: "recordatorio", to: "+525512345678", params: ["Ana\nx", "$1", "T", "d", "l"] },
      "es_MX",
    );
    expect(p.to).toBe("525512345678");
    expect(p.template.name).toBe("recordatorio_pago");
    expect(p.template.language.code).toBe("es_MX");
    expect(p.template.components[0].parameters[0].text).toBe("Ana x");
  });
});
