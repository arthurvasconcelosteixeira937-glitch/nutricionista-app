import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { get, run } from "@/lib/db";
import type { Role, TenantContext } from "./context";

export const SESSION_COOKIE = "ar_session";
const SESSION_DAYS = 7;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, tenantId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  run(
    "INSERT INTO sessions (token_hash, user_id, tenant_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
    hashToken(token),
    userId,
    tenantId,
    expires.toISOString(),
    new Date().toISOString(),
  );
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "true",
    path: "/",
    expires,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) run("DELETE FROM sessions WHERE token_hash = ?", hashToken(token));
  store.delete(SESSION_COOKIE);
}

export interface SessionInfo extends TenantContext {
  userName: string;
  userEmail: string;
  tenantName: string;
  tenantIsDemo: boolean;
  plan: string;
}

export const getSession = cache(async (): Promise<SessionInfo | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = get<{
    user_id: string;
    tenant_id: string;
    expires_at: string;
    role: Role;
    user_name: string;
    email: string;
    tenant_name: string;
    is_demo: number;
    plan: string;
  }>(
    `SELECT s.user_id, s.tenant_id, s.expires_at, m.role, u.name AS user_name, u.email,
            t.name AS tenant_name, t.is_demo, t.plan
       FROM sessions s
       JOIN memberships m ON m.user_id = s.user_id AND m.tenant_id = s.tenant_id
       JOIN users u ON u.id = s.user_id
       JOIN tenants t ON t.id = s.tenant_id
      WHERE s.token_hash = ?`,
    hashToken(token),
  );
  if (!row || row.expires_at < new Date().toISOString()) return null;
  return {
    tenantId: row.tenant_id,
    userId: row.user_id,
    role: row.role,
    userName: row.user_name,
    userEmail: row.email,
    tenantName: row.tenant_name,
    tenantIsDemo: row.is_demo === 1,
    plan: row.plan,
  };
});

/** Exige sessão válida; redireciona para o login caso contrário. */
export async function requireSession(): Promise<SessionInfo> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Contexto mínimo para repositórios (tenant + usuário + papel). */
export async function requireContext(): Promise<TenantContext> {
  const s = await requireSession();
  return { tenantId: s.tenantId, userId: s.userId, role: s.role };
}
