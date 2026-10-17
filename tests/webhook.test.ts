import { describe, expect, it, vi } from "vitest";
import { handleMercadoPagoWebhook, syncPayment, type PaymentRepo, type WebhookDeps } from "@/lib/payments/core";
import type { Cobro, MpPayment } from "@/lib/types";
import { COBRO_ID, MP_USER_ID, SECRET, SELLER_ID, headers, makeCobro, makePayment, sign } from "./helpers";

/** Banco em memória que imita as garantias do Postgres (chave única + update condicional). */
function memoryWorld(paymentFromApi: MpPayment | null = makePayment()) {
  const events = new Map<string, string>();
  const cobros = new Map<string, Cobro>([[COBRO_ID, makeCobro()]]);
  const payments = new Map<string, MpPayment>();
  const notified: string[] = [];

  const repo: PaymentRepo = {
    getCobro: async (id) => cobros.get(id) ?? null,
    upsertPayment: async (_c, p) => void payments.set(String(p.id), p),
    markPaid: async (id, p) => {
      const c = cobros.get(id);
      if (!c || c.status === "pagado" || c.status === "reembolsado") return null;
      const updated: Cobro = { ...c, status: "pagado", mp_payment_id: String(p.id), paid_amount: p.transaction_amount };
      cobros.set(id, updated);
      return updated;
    },
    markRefunded: async (id) => {
      const c = cobros.get(id)!;
      cobros.set(id, { ...c, status: "reembolsado" });
      return true;
    },
  };
  const notifier = { onPaymentConfirmed: vi.fn(async (c: Cobro) => void notified.push(c.id)) };
  const fetchPayment = vi.fn(async () => paymentFromApi);

  const deps: WebhookDeps = {
    secret: SECRET,
    recordEvent: async (key) => {
      if (events.has(key)) return "duplicate";
      events.set(key, "processing");
      return "new";
    },
    forgetEvent: async (key) => void events.delete(key),
    setEventResult: async (key, r) => void events.set(key, r),
    findAccountByMpUserId: async (id) => (id === MP_USER_ID ? { sellerId: SELLER_ID, mpUserId: MP_USER_ID } : null),
    fetchPayment,
    sync: (p, a) => syncPayment({ repo, notifier }, p, a),
  };
  return { deps, cobros, payments, notified, notifier, fetchPayment, events };
}

function request(opts: { dataId?: string; requestId?: string; signature?: string | null; body?: object } = {}) {
  const dataId = opts.dataId ?? "987654321";
  const requestId = opts.requestId ?? "req-1";
  const sig = opts.signature === undefined ? sign(dataId, requestId) : opts.signature;
  const h: Record<string, string> = { "x-request-id": requestId };
  if (sig) h["x-signature"] = sig;
  return {
    url: `https://app.test/api/webhooks/mercadopago?source_news=webhooks&data.id=${dataId}&type=payment`,
    headers: headers(h),
    bodyText: JSON.stringify(
      opts.body ?? { action: "payment.updated", type: "payment", user_id: Number(MP_USER_ID), data: { id: dataId } },
    ),
  };
}

describe("webhook do Mercado Pago", () => {
  it("marca como pagado quando a API confirma approved e avisa uma vez", async () => {
    const w = memoryWorld();
    const res = await handleMercadoPagoWebhook(w.deps, request());
    expect(res.status).toBe(200);
    expect(res.body.result).toBe("pagado");
    expect(w.cobros.get(COBRO_ID)!.status).toBe("pagado");
    expect(w.notifier.onPaymentConfirmed).toHaveBeenCalledTimes(1);
    expect(w.fetchPayment).toHaveBeenCalledWith({ sellerId: SELLER_ID, mpUserId: MP_USER_ID }, "987654321");
  });

  it("rejeita assinatura inválida com 401 e não consulta nada", async () => {
    const w = memoryWorld();
    const res = await handleMercadoPagoWebhook(w.deps, request({ signature: sign("987654321", "req-1", "1", "outra-chave") }));
    expect(res.status).toBe(401);
    expect(w.fetchPayment).not.toHaveBeenCalled();
    expect(w.cobros.get(COBRO_ID)!.status).toBe("pendiente");
  });

  it("rejeita webhook sem assinatura", async () => {
    const w = memoryWorld();
    const res = await handleMercadoPagoWebhook(w.deps, request({ signature: null }));
    expect(res.status).toBe(401);
  });

  it("rejeita assinatura válida de outro data.id (não dá para trocar o id)", async () => {
    const w = memoryWorld();
    const r = request({ signature: sign("111", "req-1") });
    const res = await handleMercadoPagoWebhook(w.deps, r);
    expect(res.status).toBe(401);
  });

  it("evento duplicado (mesmo x-request-id) não é processado de novo", async () => {
    const w = memoryWorld();
    await handleMercadoPagoWebhook(w.deps, request());
    const res2 = await handleMercadoPagoWebhook(w.deps, request());
    expect(res2.status).toBe(200);
    expect(res2.body.result).toBe("duplicado");
    expect(w.fetchPayment).toHaveBeenCalledTimes(1);
    expect(w.notifier.onPaymentConfirmed).toHaveBeenCalledTimes(1);
  });

  it("dois eventos diferentes do mesmo pagamento avisam o vendedor só uma vez", async () => {
    const w = memoryWorld();
    await handleMercadoPagoWebhook(w.deps, request({ requestId: "req-a" }));
    const res2 = await handleMercadoPagoWebhook(w.deps, request({ requestId: "req-b" }));
    expect(res2.body.result).toBe("ya_pagado");
    expect(w.notifier.onPaymentConfirmed).toHaveBeenCalledTimes(1);
  });

  it("ignora o status do corpo do webhook: só vale o que a API retorna", async () => {
    const w = memoryWorld(makePayment({ status: "pending", status_detail: "pending_waiting_payment" }));
    const res = await handleMercadoPagoWebhook(
      w.deps,
      request({ body: { type: "payment", user_id: MP_USER_ID, data: { id: "987654321", status: "approved" } } }),
    );
    expect(res.body.result).toBe("registrado");
    expect(w.cobros.get(COBRO_ID)!.status).toBe("pendiente");
    expect(w.notifier.onPaymentConfirmed).not.toHaveBeenCalled();
  });

  it.each(["pending", "in_process", "authorized", "rejected", "cancelled"])("status %s não conta como pago", async (status) => {
    const w = memoryWorld(makePayment({ status }));
    await handleMercadoPagoWebhook(w.deps, request());
    expect(w.cobros.get(COBRO_ID)!.status).toBe("pendiente");
  });

  it("pagamento que não existe na conta do vendedor é ignorado", async () => {
    const w = memoryWorld(null);
    const res = await handleMercadoPagoWebhook(w.deps, request());
    expect(res.body.result).toBe("pago_no_encontrado");
    expect(w.cobros.get(COBRO_ID)!.status).toBe("pendiente");
  });

  it("conta desconhecida é ignorada sem consultar a API", async () => {
    const w = memoryWorld();
    const res = await handleMercadoPagoWebhook(
      w.deps,
      request({ body: { type: "payment", user_id: 999, data: { id: "987654321" } } }),
    );
    expect(res.body.result).toBe("cuenta_desconocida");
    expect(w.fetchPayment).not.toHaveBeenCalled();
  });

  it("erro temporário na API libera o evento para reenvio (500)", async () => {
    const w = memoryWorld();
    w.fetchPayment.mockRejectedValueOnce(new Error("timeout"));
    const res = await handleMercadoPagoWebhook(w.deps, request());
    expect(res.status).toBe(500);
    expect(w.events.size).toBe(0);
    const retry = await handleMercadoPagoWebhook(w.deps, request());
    expect(retry.body.result).toBe("pagado");
  });

  it("tópicos que não são payment são ignorados", async () => {
    const w = memoryWorld();
    const r = request();
    r.url = r.url.replace("type=payment", "type=merchant_order");
    r.bodyText = JSON.stringify({ type: "merchant_order", data: { id: "987654321" } });
    const res = await handleMercadoPagoWebhook(w.deps, r);
    expect(res.body.result).toBe("ignorado");
    expect(w.fetchPayment).not.toHaveBeenCalled();
  });

  it("sem segredo configurado, recusa tudo", async () => {
    const w = memoryWorld();
    const res = await handleMercadoPagoWebhook({ ...w.deps, secret: undefined }, request());
    expect(res.status).toBe(500);
    expect(w.fetchPayment).not.toHaveBeenCalled();
  });
});

describe("syncPayment (validações após consultar a API)", () => {
  const account = { sellerId: SELLER_ID, mpUserId: MP_USER_ID };

  it("valor pago menor que o cobro não marca como pago", async () => {
    const w = memoryWorld();
    const r = await w.deps.sync(makePayment({ transaction_amount: 1249.99 }), account);
    expect(r).toBe("rechazado");
    expect(w.cobros.get(COBRO_ID)!.status).toBe("pendiente");
  });

  it("moeda diferente de MXN não marca como pago", async () => {
    const w = memoryWorld();
    expect(await w.deps.sync(makePayment({ currency_id: "USD" }), account)).toBe("rechazado");
  });

  it("pagamento recebido por outra conta (collector) é rejeitado", async () => {
    const w = memoryWorld();
    expect(await w.deps.sync(makePayment({ collector_id: 42 }), account)).toBe("rechazado");
  });

  it("cobro de outro vendedor não é tocado", async () => {
    const w = memoryWorld();
    const r = await w.deps.sync(makePayment(), { sellerId: "33333333-3333-4333-8333-333333333333", mpUserId: MP_USER_ID });
    expect(r).toBe("cobro_no_encontrado");
  });

  it("external_reference inválida é ignorada", async () => {
    const w = memoryWorld();
    expect(await w.deps.sync(makePayment({ external_reference: "abc" }), account)).toBe("sin_referencia");
  });

  it("reembolso de pagamento aprovado marca como reembolsado", async () => {
    const w = memoryWorld();
    await w.deps.sync(makePayment(), account);
    const r = await w.deps.sync(makePayment({ status: "refunded" }), account);
    expect(r).toBe("reembolsado");
    expect(w.cobros.get(COBRO_ID)!.status).toBe("reembolsado");
  });

  it("falha ao notificar não desfaz o pagamento", async () => {
    const w = memoryWorld();
    w.notifier.onPaymentConfirmed.mockRejectedValueOnce(new Error("whatsapp caído"));
    expect(await w.deps.sync(makePayment(), account)).toBe("pagado");
    expect(w.cobros.get(COBRO_ID)!.status).toBe("pagado");
  });
});
