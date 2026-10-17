// Regras dos lembretes automáticos. Lógica pura — coberta por testes.
import { mxHour } from "./time";
import type { Cobro } from "./types";

export const MAX_REMINDERS = 2;
export const WINDOW_START_HOUR = 9; // 9:00 no México
export const WINDOW_END_HOUR = 20; // até 19:59 no México
/** Tempo mínimo entre a criação do cobro e o 1º lembrete, e entre lembretes. */
export const MIN_HOURS_BETWEEN = 24;

export function isWithinReminderWindow(now: Date): boolean {
  const h = mxHour(now);
  return h >= WINDOW_START_HOUR && h < WINDOW_END_HOUR;
}

export type ReminderCheck = { ok: true } | { ok: false; reason: string };

export function canSendReminder(
  cobro: Pick<Cobro, "status" | "reminders_enabled" | "reminders_sent" | "last_reminder_at" | "created_at" | "due_at">,
  sellerRemindersEnabled: boolean,
  now: Date,
  opts: { ignoreSchedule?: boolean } = {},
): ReminderCheck {
  if (cobro.status !== "pendiente") return { ok: false, reason: "El cobro no está pendiente" };
  if (cobro.due_at && new Date(cobro.due_at).getTime() < now.getTime()) {
    return { ok: false, reason: "El cobro ya venció" };
  }
  if (!sellerRemindersEnabled || !cobro.reminders_enabled) {
    return { ok: false, reason: "Los recordatorios están desactivados" };
  }
  if (cobro.reminders_sent >= MAX_REMINDERS) {
    return { ok: false, reason: `Ya se enviaron ${MAX_REMINDERS} recordatorios` };
  }
  if (!isWithinReminderWindow(now)) {
    return { ok: false, reason: "Solo enviamos recordatorios entre 9:00 y 20:00 (hora del centro de México)" };
  }
  if (!opts.ignoreSchedule) {
    const ref = cobro.last_reminder_at ?? cobro.created_at;
    const hours = (now.getTime() - new Date(ref).getTime()) / 3_600_000;
    if (hours < MIN_HOURS_BETWEEN) return { ok: false, reason: "Todavía es muy pronto para otro recordatorio" };
  }
  return { ok: true };
}
