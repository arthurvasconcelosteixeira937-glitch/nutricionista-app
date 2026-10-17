"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { effectiveStatus } from "@/lib/cobro-status";
import { CobroError, cancelCobro, cobroInputSchema, createCobro } from "@/lib/cobros";
import { buildMessage, sendAndLog } from "@/lib/messages";
import { getMessagingProvider } from "@/lib/messaging";
import { reconcileCobro } from "@/lib/payments/service";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_REMINDERS, canSendReminder } from "@/lib/reminders";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Cobro } from "@/lib/types";

export type CobroFormState =
  | { error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string> }
  | undefined;
export type MessageActionResult = { ok: boolean; message: string; waLink?: string };

const UUID_RE = /^[0-9a-f-]{36}$/i;

async function loadOwnCobro(cobroId: string) {
  const user = await requireUser();
  if (!UUID_RE.test(cobroId)) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("cobros").select("*").eq("id", cobroId).eq("seller_id", user.id).maybeSingle();
  if (!data) return null;
  const { data: profile } = await admin.from("profiles").select("business_name, whatsapp, reminders_enabled").eq("id", user.id).single();
  return { user, cobro: data as Cobro, profile: profile as { business_name: string; whatsapp: string | null; reminders_enabled: boolean } };
}

export async function createCobroAction(_: CobroFormState, formData: FormData): Promise<CobroFormState> {
  const user = await requireUser();
  if (!(await rateLimit(`cobro:create:${user.id}`, 30, 3600))) {
    return { error: "Creaste muchos cobros en poco tiempo. Espera un momento.", values: undefined };
  }
  // Devolvemos o que foi digitado: o React limpa o formulário depois de cada envio.
  const values = Object.fromEntries(
    ["customer_name", "customer_phone", "amount", "description", "due_date"].map((k) => [k, String(formData.get(k) ?? "")]),
  );
  const parsed = cobroInputSchema.safeParse({
    customer_name: formData.get("customer_name"),
    customer_phone: formData.get("customer_phone"),
    amount: formData.get("amount"),
    description: formData.get("description"),
    due_date: formData.get("due_date") || undefined,
    reminders_enabled: formData.get("reminders_enabled") === "on",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { error: "Revisa los datos marcados.", fieldErrors, values };
  }

  let cobro: Cobro;
  try {
    cobro = await createCobro(user.id, parsed.data);
  } catch (e) {
    return { error: e instanceof CobroError ? e.message : "No pudimos crear el cobro. Intenta de nuevo.", values };
  }

  // No modo cloud_api já enviamos ao cliente; no manual, a próxima tela mostra o botão do WhatsApp.
  let sent = "manual";
  if (getMessagingProvider().mode === "cloud_api") {
    const { data: profile } = await createAdminClient().from("profiles").select("business_name").eq("id", user.id).single();
    const r = await sendAndLog(buildMessage("cobro_nuevo", cobro, profile?.business_name ?? ""), {
      sellerId: user.id,
      cobroId: cobro.id,
    });
    sent = r.status === "sent" ? "enviado" : "fallo";
  }
  revalidatePath("/panel");
  redirect(`/panel/cobros/${cobro.id}?nuevo=${sent}`);
}

export async function cancelCobroAction(cobroId: string): Promise<MessageActionResult> {
  const user = await requireUser();
  try {
    await cancelCobro(user.id, cobroId);
  } catch (e) {
    return { ok: false, message: e instanceof CobroError ? e.message : "No pudimos cancelar el cobro." };
  }
  revalidatePath(`/panel/cobros/${cobroId}`);
  revalidatePath("/panel");
  return { ok: true, message: "Cobro cancelado." };
}

/** Reenvia o cobro ao cliente (cloud_api) ou devolve o link wa.me (manual). */
export async function sendCobroAction(cobroId: string): Promise<MessageActionResult> {
  const ctx = await loadOwnCobro(cobroId);
  if (!ctx) return { ok: false, message: "Cobro no encontrado." };
  if (effectiveStatus(ctx.cobro) !== "pendiente") return { ok: false, message: "Este cobro ya no está pendiente." };
  if (!(await rateLimit(`cobro:send:${cobroId}`, 10, 3600))) return { ok: false, message: "Demasiados envíos. Espera un rato." };
  const r = await sendAndLog(buildMessage("cobro_nuevo", ctx.cobro, ctx.profile.business_name), {
    sellerId: ctx.user.id,
    cobroId,
  });
  if (r.status === "sent") return { ok: true, message: "Enviado por WhatsApp ✅" };
  return { ok: true, message: "Abre WhatsApp para enviarlo.", waLink: r.waLink };
}

/** Lembrete manual: respeita o máximo de 2 e o horário 9h–20h. */
export async function sendReminderAction(cobroId: string): Promise<MessageActionResult> {
  const ctx = await loadOwnCobro(cobroId);
  if (!ctx) return { ok: false, message: "Cobro no encontrado." };
  // Clique manual é explícito: vale mesmo com o automático desligado, mas respeita limite e horário.
  const check = canSendReminder({ ...ctx.cobro, reminders_enabled: true }, true, new Date(), { ignoreSchedule: true });
  if (!check.ok) return { ok: false, message: check.reason };

  const { data: claimed } = await createAdminClient().rpc("claim_reminder", { p_cobro_id: cobroId, p_max: MAX_REMINDERS });
  if (claimed !== true) return { ok: false, message: `Ya se enviaron ${MAX_REMINDERS} recordatorios para este cobro.` };

  const r = await sendAndLog(buildMessage("recordatorio", ctx.cobro, ctx.profile.business_name), {
    sellerId: ctx.user.id,
    cobroId,
  });
  revalidatePath(`/panel/cobros/${cobroId}`);
  if (r.status === "sent") return { ok: true, message: "Recordatorio enviado ✅" };
  return { ok: true, message: "Abre WhatsApp para enviar el recordatorio.", waLink: r.waLink };
}

/** Recibo para o cliente (só quando pago). */
export async function sendReceiptAction(cobroId: string): Promise<MessageActionResult> {
  const ctx = await loadOwnCobro(cobroId);
  if (!ctx) return { ok: false, message: "Cobro no encontrado." };
  if (ctx.cobro.status !== "pagado") return { ok: false, message: "Solo puedes enviar recibo de cobros pagados." };
  if (!(await rateLimit(`cobro:receipt:${cobroId}`, 5, 3600))) return { ok: false, message: "Demasiados envíos. Espera un rato." };
  const r = await sendAndLog(buildMessage("recibo_cliente", ctx.cobro, ctx.profile.business_name), {
    sellerId: ctx.user.id,
    cobroId,
  });
  if (r.status === "sent") {
    await createAdminClient().from("cobros").update({ receipt_sent_at: new Date().toISOString() }).eq("id", cobroId);
    return { ok: true, message: "Recibo enviado ✅" };
  }
  return { ok: true, message: "Abre WhatsApp para enviar el recibo.", waLink: r.waLink };
}

/** Consulta o Mercado Pago agora mesmo. */
export async function checkCobroAction(cobroId: string): Promise<MessageActionResult> {
  const ctx = await loadOwnCobro(cobroId);
  if (!ctx) return { ok: false, message: "Cobro no encontrado." };
  if (!(await rateLimit(`cobro:check:${cobroId}`, 6, 60))) return { ok: false, message: "Espera unos segundos e intenta de nuevo." };
  if (ctx.cobro.status === "pagado") return { ok: true, message: "Este cobro ya está pagado ✅" };
  try {
    const r = await reconcileCobro(ctx.cobro);
    revalidatePath(`/panel/cobros/${cobroId}`);
    if (r === "pagado" || r === "ya_pagado") return { ok: true, message: "¡Pago confirmado por Mercado Pago! ✅" };
    return { ok: true, message: "Mercado Pago todavía no confirma ningún pago aprobado para este cobro." };
  } catch {
    return { ok: false, message: "No pudimos consultar a Mercado Pago. Intenta en un momento." };
  }
}

export async function toggleCobroRemindersAction(cobroId: string, enabled: boolean): Promise<MessageActionResult> {
  const ctx = await loadOwnCobro(cobroId);
  if (!ctx) return { ok: false, message: "Cobro no encontrado." };
  await createAdminClient().from("cobros").update({ reminders_enabled: enabled }).eq("id", cobroId).eq("seller_id", ctx.user.id);
  revalidatePath(`/panel/cobros/${cobroId}`);
  return { ok: true, message: enabled ? "Recordatorios activados." : "Recordatorios desactivados." };
}
