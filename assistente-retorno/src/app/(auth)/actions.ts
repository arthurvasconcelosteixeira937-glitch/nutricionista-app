"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, destroySession, getSession } from "@/lib/auth/session";
import { clearFailures, isRateLimited, registerFailure } from "@/lib/auth/rate-limit";
import { createAccount, findUserForLogin } from "@/lib/repos/accounts";
import { logAudit } from "@/lib/repos/audit";
import { formToObject, safeAction } from "@/lib/actions";
import { loginSchema, signupSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/action-state";
import { DomainError } from "@/lib/domain/errors";

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const input = loginSchema.parse(formToObject(fd));
    const key = `${input.email}|${await clientIp()}`;
    if (isRateLimited(key)) throw new DomainError("Muitas tentativas. Aguarde 15 minutos e tente novamente.");
    const found = findUserForLogin(input.email, input.password);
    if (!found) {
      registerFailure(key);
      throw new DomainError("E-mail ou senha incorretos.");
    }
    clearFailures(key);
    await createSession(found.userId, found.tenantId);
    logAudit(found, "auth.login");
    redirect("/painel");
  });
}

export async function signupAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const input = signupSchema.parse(formToObject(fd));
    const created = createAccount(input);
    await createSession(created.userId, created.tenantId);
    logAudit(created, "auth.signup");
    redirect("/painel?bemvindo=1");
  });
}

export async function logoutAction(): Promise<void> {
  const session = await getSession();
  if (session) logAudit(session, "auth.logout");
  await destroySession();
  redirect("/login");
}
