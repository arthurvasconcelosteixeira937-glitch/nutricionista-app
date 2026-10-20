import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { safeTimeZone, todayInTz } from "./format";
import type { Profile } from "./types";
import { hasAccess } from "./subscription";

export const PROFILE_COLUMNS =
  "id, full_name, business_name, service_type, zelle, venmo, cashapp, accepts_cash, timezone, onboarded, trial_ends_at, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end";

export const getSupabase = cache(async () => createClient());

export const getUser = cache(async () => {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await getSupabase();
  const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", user.id).maybeSingle();
  return (data as Profile | null) ?? null;
});

/** Perfil obligatorio: redirige a /entrar si no hay sesión. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");
  return { ...profile, timezone: safeTimeZone(profile.timezone) };
}

/** Crea los cobros de trabajos fijos que ya tocan y devuelve "hoy" del usuario. */
export const syncRecurring = cache(async (timezone: string) => {
  const today = todayInTz(timezone);
  const supabase = await getSupabase();
  await supabase.rpc("generate_recurring_jobs", { p_today: today });
  return today;
});

/** Para páginas dentro de la app: exige sesión, onboarding y acceso (prueba o suscripción). */
export async function requireAppProfile(): Promise<Profile> {
  const profile = await requireProfile();
  if (!profile.onboarded) redirect("/bienvenida");
  if (!hasAccess(profile)) redirect("/suscripcion");
  return profile;
}

export const JOB_COLUMNS =
  "id, client_id, description, amount, amount_paid, is_paid, service_date, due_date, recurrence, next_generated, series_id, paid_at, receipt_number, created_at";
export const JOB_WITH_CLIENT = `${JOB_COLUMNS}, client:clients(id, name, phone, language)`;
export { CLIENT_SELECT as CLIENT_COLUMNS } from "./queries";
