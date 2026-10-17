"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { safeNext } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: string; email?: string } | undefined;

const email = z.string().trim().toLowerCase().email("Escribe un correo válido");
const password = z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72);

async function limited(action: string) {
  const ip = clientIp(await headers());
  return !(await rateLimit(`auth:${action}:${ip}`, 10, 600));
}

/** Traduz erros comuns do Supabase Auth para espanhol. */
function authError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Confirma tu correo antes de entrar. Revisa tu bandeja de entrada.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Ese correo ya tiene cuenta. Inicia sesión.";
  if (m.includes("rate limit") || m.includes("too many")) return "Demasiados intentos. Espera unos minutos.";
  if (m.includes("weak") || m.includes("password")) return "Esa contraseña no es válida. Usa al menos 8 caracteres.";
  return "Algo salió mal. Intenta de nuevo.";
}

export async function signInAction(_: FormState, formData: FormData): Promise<FormState> {
  if (await limited("login")) return { error: "Demasiados intentos. Espera unos minutos." };
  const parsed = z.object({ email, password: z.string().min(1, "Escribe tu contraseña") }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: authError(error.message), email: parsed.data.email };
  redirect(safeNext(String(formData.get("next") ?? ""), "/panel"));
}

export async function signUpAction(_: FormState, formData: FormData): Promise<FormState> {
  if (await limited("signup")) return { error: "Demasiados intentos. Espera unos minutos." };
  const parsed = z
    .object({ email, password, accept: z.literal("on", { message: "Debes aceptar los Términos y el Aviso de Privacidad" }) })
    .safeParse({ email: formData.get("email"), password: formData.get("password"), accept: formData.get("accept") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, email: String(formData.get("email") ?? "") };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${env.appUrl()}/auth/callback?next=/onboarding` },
  });
  if (error) return { error: authError(error.message), email: parsed.data.email };
  if (!data.session) {
    return { ok: "¡Listo! Te enviamos un correo para confirmar tu cuenta. Ábrelo desde este mismo celular." };
  }
  redirect("/onboarding");
}

export async function resetPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  if (await limited("reset")) return { error: "Demasiados intentos. Espera unos minutos." };
  const parsed = email.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${env.appUrl()}/auth/callback?next=/nueva-contrasena`,
  });
  // Mesma resposta exista ou não a conta (não revelar quem tem cadastro).
  return { ok: "Si existe una cuenta con ese correo, te enviamos un enlace para crear una nueva contraseña." };
}

export async function updatePasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({ password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "Las contraseñas no coinciden" })
    .safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: authError(error.message) };
  redirect("/panel?contrasena=ok");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
