import "server-only";
import { randomUUID } from "node:crypto";
import { get, run, transaction } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { DomainError } from "@/lib/domain/errors";
import { DEFAULT_SERVICES } from "@/lib/db/seed";

export function findUserForLogin(
  email: string,
  password: string,
): { userId: string; tenantId: string } | null {
  const user = get<{ id: string; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE email = ?",
    email.toLowerCase(),
  );
  if (!user || !verifyPassword(password, user.password_hash)) return null;
  const membership = get<{ tenant_id: string }>(
    "SELECT tenant_id FROM memberships WHERE user_id = ? ORDER BY created_at LIMIT 1",
    user.id,
  );
  if (!membership) return null;
  return { userId: user.id, tenantId: membership.tenant_id };
}

export function createAccount(input: {
  salonName: string;
  userName: string;
  email: string;
  password: string;
}): { userId: string; tenantId: string } {
  const email = input.email.toLowerCase();
  if (get("SELECT 1 AS x FROM users WHERE email = ?", email)) {
    throw new DomainError("Já existe uma conta com este e-mail.");
  }
  const now = new Date().toISOString();
  const tenantId = randomUUID();
  const userId = randomUUID();
  transaction(() => {
    run(
      "INSERT INTO tenants (id, name, plan, default_interval_days, created_at) VALUES (?, ?, 'piloto', 60, ?)",
      tenantId,
      input.salonName,
      now,
    );
    run(
      "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
      userId,
      email,
      input.userName,
      hashPassword(input.password),
      now,
    );
    run(
      "INSERT INTO memberships (tenant_id, user_id, role, created_at) VALUES (?, ?, 'owner', ?)",
      tenantId,
      userId,
      now,
    );
    for (const [name, days] of DEFAULT_SERVICES) {
      run(
        "INSERT INTO services (id, tenant_id, name, return_interval_days, created_at) VALUES (?, ?, ?, ?, ?)",
        randomUUID(),
        tenantId,
        name,
        days,
        now,
      );
    }
  });
  return { userId, tenantId };
}
