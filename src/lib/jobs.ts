import "server-only";
// Tarefas agendadas (chamadas pelos cron jobs da Vercel).
import { computeAccess } from "./billing/access";
import { getValidAccessToken, type MpAccountRow } from "./mercadopago/tokens";
import { buildMessage, sendAndLog } from "./messages";
import { getMessagingProvider } from "./messaging";
import { reconcileCobro } from "./payments/service";
import { MAX_REMINDERS, MIN_HOURS_BETWEEN, canSendReminder, isWithinReminderWindow } from "./reminders";
import { createAdminClient } from "./supabase/admin";
import type { Cobro, Subscription } from "./types";

/** Cron de segurança: consulta no Mercado Pago os cobros pendentes (caso um webhook tenha se perdido). */
export async function runReconcile(now = new Date()) {
  const admin = createAdminClient();
  const since = new Date(now.getTime() - 35 * 86_400_000).toISOString();
  const staleBefore = new Date(now.getTime() - 20 * 60_000).toISOString();

  const { data, error } = await admin
    .from("cobros")
    .select("*")
    .in("status", ["pendiente", "vencido"])
    .not("mp_preference_id", "is", null)
    .gte("created_at", since)
    .or(`last_checked_at.is.null,last_checked_at.lt.${staleBefore}`)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(50);
  if (error) throw new Error(error.message);

  const results: Record<string, number> = {};
  for (const cobro of (data ?? []) as Cobro[]) {
    try {
      const r = await reconcileCobro(cobro);
      results[r] = (results[r] ?? 0) + 1;
    } catch (e) {
      results.error = (results.error ?? 0) + 1;
      console.error("[cron reconcile]", cobro.id, e);
    }
  }

  // Pendentes com prazo vencido → "vencido" (depois de conferir pagamentos acima)
  const { data: expired } = await admin
    .from("cobros")
    .update({ status: "vencido" })
    .eq("status", "pendiente")
    .lt("due_at", now.toISOString())
    .select("id");

  // Renova tokens que vencem em menos de 30 dias
  const { data: accounts } = await admin
    .from("mp_accounts")
    .select("seller_id, mp_user_id, access_token_enc, refresh_token_enc, expires_at, live_mode")
    .lt("expires_at", new Date(now.getTime() + 30 * 86_400_000).toISOString())
    .limit(20);
  let refreshed = 0;
  for (const acc of (accounts ?? []) as MpAccountRow[]) {
    try {
      await getValidAccessToken(acc, now);
      refreshed++;
    } catch (e) {
      console.error("[cron reconcile] token", acc.seller_id, e);
    }
  }

  return { checked: (data ?? []).length, results, expired: (expired ?? []).length, tokensChecked: refreshed };
}

/** Cron de lembretes automáticos (só no modo cloud_api; no manual o painel mostra o botão). */
export async function runReminders(now = new Date()) {
  if (getMessagingProvider().mode !== "cloud_api") return { skipped: "modo_manual" };
  if (!isWithinReminderWindow(now)) return { skipped: "fuera_de_horario" };

  const admin = createAdminClient();
  const createdBefore = new Date(now.getTime() - MIN_HOURS_BETWEEN * 3_600_000).toISOString();
  const { data, error } = await admin
    .from("cobros")
    .select("*, profiles!inner(business_name, reminders_enabled, subscriptions(*))")
    .eq("status", "pendiente")
    .eq("reminders_enabled", true)
    .lt("reminders_sent", MAX_REMINDERS)
    .lt("created_at", createdBefore)
    .limit(200);
  if (error) throw new Error(error.message);

  let sent = 0;
  let skipped = 0;
  for (const row of (data ?? []) as (Cobro & {
    profiles: { business_name: string | null; reminders_enabled: boolean; subscriptions: Subscription | Subscription[] | null };
  })[]) {
    const { profiles: p, ...cobro } = row;
    const sub = Array.isArray(p.subscriptions) ? (p.subscriptions[0] ?? null) : p.subscriptions;
    if (!canSendReminder(cobro, p.reminders_enabled, now).ok || !computeAccess(sub, now).canCreateCobros) {
      skipped++;
      continue;
    }
    // Reserva atômica do lembrete: garante o máximo de 2 mesmo com execuções simultâneas.
    const { data: claimed } = await admin.rpc("claim_reminder", { p_cobro_id: cobro.id, p_max: MAX_REMINDERS });
    if (claimed !== true) {
      skipped++;
      continue;
    }
    const r = await sendAndLog(buildMessage("recordatorio", cobro, p.business_name ?? "Tu vendedor"), {
      sellerId: cobro.seller_id,
      cobroId: cobro.id,
    });
    if (r.status === "sent") sent++;
  }
  return { candidates: (data ?? []).length, sent, skipped };
}
