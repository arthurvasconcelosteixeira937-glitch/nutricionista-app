import { describe, expect, it } from "vitest";
import { computeAccess } from "@/lib/billing/access";
import { decidePaymentAction, effectiveStatus } from "@/lib/cobro-status";
import { MAX_REMINDERS, canSendReminder, isWithinReminderWindow } from "@/lib/reminders";
import type { Subscription } from "@/lib/types";
import { MP_USER_ID, makeCobro, makePayment } from "./helpers";

// 2026-10-10 15:00 UTC = 09:00 no México (UTC-6)
const at = (iso: string) => new Date(iso);

describe("status do pagamento", () => {
  it("só approved marca como pago", () => {
    for (const status of ["pending", "in_process", "authorized", "rejected", "cancelled", "in_mediation"]) {
      expect(decidePaymentAction(makePayment({ status }), makeCobro(), MP_USER_ID).action).toBe("record_only");
    }
    expect(decidePaymentAction(makePayment(), makeCobro(), MP_USER_ID).action).toBe("mark_paid");
  });

  it("valor maior que o cobro é aceito, menor não", () => {
    expect(decidePaymentAction(makePayment({ transaction_amount: 1300 }), makeCobro(), MP_USER_ID).action).toBe("mark_paid");
    expect(decidePaymentAction(makePayment({ transaction_amount: 1000 }), makeCobro(), MP_USER_ID).action).toBe("reject");
  });

  it("pagamento aprovado depois do vencimento ou cancelamento ainda conta (o dinheiro caiu)", () => {
    expect(decidePaymentAction(makePayment(), makeCobro({ status: "vencido" }), MP_USER_ID).action).toBe("mark_paid");
    expect(decidePaymentAction(makePayment(), makeCobro({ status: "cancelado" }), MP_USER_ID).action).toBe("mark_paid");
  });

  it("chargeback de outro pagamento não altera um cobro pago", () => {
    const cobro = makeCobro({ status: "pagado", mp_payment_id: "1" });
    expect(decidePaymentAction(makePayment({ id: 2, status: "charged_back" }), cobro, MP_USER_ID).action).toBe("record_only");
    expect(decidePaymentAction(makePayment({ id: 1, status: "charged_back" }), cobro, MP_USER_ID).action).toBe("mark_refunded");
  });

  it("effectiveStatus mostra vencido quando passou o prazo", () => {
    const now = at("2026-10-10T12:00:00Z");
    expect(effectiveStatus({ status: "pendiente", due_at: "2026-10-09T05:59:59Z" }, now)).toBe("vencido");
    expect(effectiveStatus({ status: "pendiente", due_at: "2026-10-11T05:59:59Z" }, now)).toBe("pendiente");
    expect(effectiveStatus({ status: "pagado", due_at: "2026-10-09T05:59:59Z" }, now)).toBe("pagado");
  });
});

describe("lembretes", () => {
  const base = makeCobro({ created_at: "2026-10-09T15:00:00Z" });

  it("janela 9h–20h no horário do México", () => {
    expect(isWithinReminderWindow(at("2026-10-10T14:59:00Z"))).toBe(false); // 08:59
    expect(isWithinReminderWindow(at("2026-10-10T15:00:00Z"))).toBe(true); // 09:00
    expect(isWithinReminderWindow(at("2026-10-11T01:59:00Z"))).toBe(true); // 19:59
    expect(isWithinReminderWindow(at("2026-10-11T02:00:00Z"))).toBe(false); // 20:00
  });

  it("no máximo 2 por cobro", () => {
    const now = at("2026-10-12T18:00:00Z");
    expect(canSendReminder({ ...base, reminders_sent: 1, last_reminder_at: "2026-10-10T18:00:00Z" }, true, now).ok).toBe(true);
    const r = canSendReminder({ ...base, reminders_sent: MAX_REMINDERS, last_reminder_at: "2026-10-10T18:00:00Z" }, true, now);
    expect(r.ok).toBe(false);
  });

  it("respeita o intervalo mínimo de 24h", () => {
    expect(canSendReminder(base, true, at("2026-10-10T14:00:00Z")).ok).toBe(false); // 08:00, fora da janela
    expect(canSendReminder(base, true, at("2026-10-09T20:00:00Z")).ok).toBe(false); // 5h depois
    expect(canSendReminder(base, true, at("2026-10-10T16:00:00Z")).ok).toBe(true); // 25h depois, 10:00
  });

  it("botão manual pode ignorar o intervalo, mas não o limite nem a janela", () => {
    const now = at("2026-10-09T20:00:00Z"); // 14:00 México
    expect(canSendReminder(base, true, now, { ignoreSchedule: true }).ok).toBe(true);
    expect(canSendReminder({ ...base, reminders_sent: 2 }, true, now, { ignoreSchedule: true }).ok).toBe(false);
    expect(canSendReminder(base, true, at("2026-10-10T03:00:00Z"), { ignoreSchedule: true }).ok).toBe(false);
  });

  it("desligado no vendedor ou no cobro bloqueia", () => {
    const now = at("2026-10-10T16:00:00Z");
    expect(canSendReminder(base, false, now).ok).toBe(false);
    expect(canSendReminder({ ...base, reminders_enabled: false }, true, now).ok).toBe(false);
  });

  it("não lembra cobros pagos, cancelados ou vencidos", () => {
    const now = at("2026-10-10T16:00:00Z");
    expect(canSendReminder({ ...base, status: "pagado" }, true, now).ok).toBe(false);
    expect(canSendReminder({ ...base, status: "cancelado" }, true, now).ok).toBe(false);
    expect(canSendReminder({ ...base, due_at: "2026-10-10T05:00:00Z" }, true, now).ok).toBe(false);
  });
});

describe("bloqueio por assinatura", () => {
  const now = at("2026-10-10T12:00:00Z");
  const sub = (over: Partial<Subscription>): Subscription => ({
    seller_id: "x",
    provider: "manual",
    status: "trialing",
    trial_ends_at: "2026-10-15T12:00:00Z",
    current_period_end: null,
    ...over,
  });

  it("trial válido pode criar cobros", () => {
    const a = computeAccess(sub({}), now);
    expect(a.canCreateCobros).toBe(true);
    expect(a.trialDaysLeft).toBe(5);
  });

  it("trial vencido bloqueia", () => {
    expect(computeAccess(sub({ trial_ends_at: "2026-10-10T11:59:59Z" }), now).canCreateCobros).toBe(false);
  });

  it("ativa sem data de fim ou com fim no futuro libera", () => {
    expect(computeAccess(sub({ status: "active" }), now).canCreateCobros).toBe(true);
    expect(computeAccess(sub({ status: "active", current_period_end: "2026-11-10T00:00:00Z" }), now).canCreateCobros).toBe(true);
  });

  it("ativa com período vencido bloqueia", () => {
    expect(computeAccess(sub({ status: "active", current_period_end: "2026-10-01T00:00:00Z" }), now).canCreateCobros).toBe(false);
  });

  it.each(["inactive", "canceled", "past_due"] as const)("%s bloqueia", (status) => {
    expect(computeAccess(sub({ status }), now).canCreateCobros).toBe(false);
  });

  it("sem assinatura bloqueia", () => {
    expect(computeAccess(null, now).canCreateCobros).toBe(false);
  });
});
