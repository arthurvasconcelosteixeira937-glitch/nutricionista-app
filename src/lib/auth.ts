import "server-only";
import { redirect } from "next/navigation";
import { getBillingProvider } from "./billing";
import { env } from "./env";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import type { Profile, Subscription } from "./types";

/** Usuário logado (verificado no servidor do Supabase) ou null. */
export async function getUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const admin = env.adminEmail();
  return Boolean(admin && email && email.toLowerCase() === admin);
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdminEmail(user.email)) redirect("/panel");
  return user;
}

export interface SellerContext {
  user: { id: string; email: string };
  profile: Profile;
  subscription: Subscription | null;
  mpConnected: boolean;
  access: ReturnType<ReturnType<typeof getBillingProvider>["getAccess"]>;
}

/** Carrega perfil, assinatura e conexão MP do vendedor logado. */
export async function getSellerContext(): Promise<SellerContext> {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: profile }, { data: subscription }, { data: mp }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("subscriptions").select("*").eq("seller_id", user.id).maybeSingle(),
    // mp_accounts não é visível pelo RLS: consultamos com service role, só a existência.
    createAdminClient().from("mp_accounts").select("seller_id").eq("seller_id", user.id).maybeSingle(),
  ]);
  if (!profile) {
    // Perfil é criado por trigger no cadastro; se faltar, algo está errado com a migration.
    throw new Error("Perfil no encontrado. ¿Ejecutaste la migración de la base de datos?");
  }
  const sub = (subscription as Subscription | null) ?? null;
  return {
    user: { id: user.id, email: user.email ?? "" },
    profile: profile as Profile,
    subscription: sub,
    mpConnected: Boolean(mp),
    access: getBillingProvider().getAccess(sub),
  };
}
