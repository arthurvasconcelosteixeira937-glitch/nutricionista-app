import { createHmac } from "node:crypto";
import type { Cobro, MpPayment } from "@/lib/types";

export const SECRET = "test-webhook-secret";
export const SELLER_ID = "11111111-1111-4111-8111-111111111111";
export const COBRO_ID = "22222222-2222-4222-8222-222222222222";
export const MP_USER_ID = "123456789";

export function makeCobro(over: Partial<Cobro> = {}): Cobro {
  return {
    id: COBRO_ID,
    seller_id: SELLER_ID,
    public_code: "AbCdEfGhJkMnPqRsTu",
    customer_name: "Ana",
    customer_phone: "+525512345678",
    amount: "1250.00",
    currency: "MXN",
    description: "2 blusas",
    due_at: null,
    status: "pendiente",
    mp_preference_id: "pref-1",
    checkout_url: "https://mp/checkout",
    mp_payment_id: null,
    paid_amount: null,
    paid_at: null,
    payment_method: null,
    canceled_at: null,
    reminders_enabled: true,
    reminders_sent: 0,
    last_reminder_at: null,
    seller_notified_at: null,
    receipt_sent_at: null,
    last_checked_at: null,
    created_at: "2026-10-01T15:00:00.000Z",
    updated_at: "2026-10-01T15:00:00.000Z",
    ...over,
  };
}

export function makePayment(over: Partial<MpPayment> = {}): MpPayment {
  return {
    id: 987654321,
    status: "approved",
    status_detail: "accredited",
    external_reference: COBRO_ID,
    transaction_amount: 1250,
    currency_id: "MXN",
    payment_method_id: "oxxo",
    payment_type_id: "ticket",
    date_approved: "2026-10-02T16:00:00.000-06:00",
    collector_id: Number(MP_USER_ID),
    live_mode: false,
    ...over,
  };
}

export function sign(dataId: string, requestId: string, ts = "1704908010", secret = SECRET) {
  const v1 = createHmac("sha256", secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

export function headers(map: Record<string, string>) {
  const lower = Object.fromEntries(Object.entries(map).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (name: string) => lower[name.toLowerCase()] ?? null };
}
