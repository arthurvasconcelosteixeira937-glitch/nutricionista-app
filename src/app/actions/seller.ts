"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { normalizeMxPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FormState } from "./auth";

const businessName = z.string().trim().min(2, "Escribe el nombre de tu negocio").max(60, "Máximo 60 caracteres");

export async function saveBusinessAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = businessName.safeParse(formData.get("business_name"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await createAdminClient().from("profiles").update({ business_name: parsed.data }).eq("id", user.id);
  if (error) return { error: "No pudimos guardar. Intenta de nuevo." };
  redirect("/onboarding");
}

export async function saveWhatsappAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const phone = normalizeMxPhone(String(formData.get("whatsapp") ?? ""));
  if (!phone) return { error: "WhatsApp inválido: escribe 10 dígitos de México, por ejemplo 55 1234 5678." };

  const admin = createAdminClient();
  const { data: mp } = await admin.from("mp_accounts").select("seller_id").eq("seller_id", user.id).maybeSingle();
  const { error } = await admin
    .from("profiles")
    .update({ whatsapp: phone, onboarding_completed: Boolean(mp) })
    .eq("id", user.id);
  if (error) return { error: "No pudimos guardar. Intenta de nuevo." };
  redirect(mp ? "/panel?bienvenida=1" : "/onboarding");
}

export async function updateSettingsAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = businessName.safeParse(formData.get("business_name"));
  if (!name.success) return { error: name.error.issues[0].message };
  const phone = normalizeMxPhone(String(formData.get("whatsapp") ?? ""));
  if (!phone) return { error: "WhatsApp inválido: escribe 10 dígitos de México." };

  const { error } = await createAdminClient()
    .from("profiles")
    .update({
      business_name: name.data,
      whatsapp: phone,
      reminders_enabled: formData.get("reminders_enabled") === "on",
    })
    .eq("id", user.id);
  if (error) return { error: "No pudimos guardar. Intenta de nuevo." };
  revalidatePath("/panel", "layout");
  return { ok: "Cambios guardados." };
}
