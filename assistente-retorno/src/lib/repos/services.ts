import "server-only";
import { randomUUID } from "node:crypto";
import { all, get, run } from "@/lib/db";
import type { TenantContext } from "@/lib/auth/context";
import { DomainError, NotFoundError } from "@/lib/domain/errors";

export interface ServiceRow {
  id: string;
  name: string;
  return_interval_days: number | null;
}

export function listServices(ctx: TenantContext): ServiceRow[] {
  return all<ServiceRow>(
    "SELECT id, name, return_interval_days FROM services WHERE tenant_id = ? ORDER BY name COLLATE NOCASE",
    ctx.tenantId,
  );
}

export function getService(ctx: TenantContext, id: string): ServiceRow | undefined {
  return get<ServiceRow>(
    "SELECT id, name, return_interval_days FROM services WHERE tenant_id = ? AND id = ?",
    ctx.tenantId,
    id,
  );
}

export function findServiceByName(ctx: TenantContext, name: string): ServiceRow | undefined {
  return get<ServiceRow>(
    "SELECT id, name, return_interval_days FROM services WHERE tenant_id = ? AND name = ? COLLATE NOCASE",
    ctx.tenantId,
    name.trim(),
  );
}

/** Retorna o serviço existente com esse nome ou cria um novo, sem prazo próprio. */
export function ensureService(ctx: TenantContext, name: string): ServiceRow {
  const existing = findServiceByName(ctx, name);
  if (existing) return existing;
  const id = randomUUID();
  run(
    "INSERT INTO services (id, tenant_id, name, return_interval_days, created_at) VALUES (?, ?, ?, NULL, ?)",
    id,
    ctx.tenantId,
    name.trim(),
    new Date().toISOString(),
  );
  return { id, name: name.trim(), return_interval_days: null };
}

export function upsertService(
  ctx: TenantContext,
  input: { id?: string | null; name: string; returnIntervalDays: number | null },
): void {
  const clash = findServiceByName(ctx, input.name);
  if (clash && clash.id !== input.id) throw new DomainError("Já existe um serviço com este nome.");
  if (input.id) {
    const r = run(
      "UPDATE services SET name = ?, return_interval_days = ? WHERE tenant_id = ? AND id = ?",
      input.name.trim(),
      input.returnIntervalDays,
      ctx.tenantId,
      input.id,
    );
    if (r.changes === 0) throw new NotFoundError("Serviço");
    run(
      "UPDATE visits SET service_name = ? WHERE tenant_id = ? AND service_id = ?",
      input.name.trim(),
      ctx.tenantId,
      input.id,
    );
  } else {
    run(
      "INSERT INTO services (id, tenant_id, name, return_interval_days, created_at) VALUES (?, ?, ?, ?, ?)",
      randomUUID(),
      ctx.tenantId,
      input.name.trim(),
      input.returnIntervalDays,
      new Date().toISOString(),
    );
  }
}
