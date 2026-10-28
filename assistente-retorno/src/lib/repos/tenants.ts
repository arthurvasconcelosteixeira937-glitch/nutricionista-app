import "server-only";
import { get, run } from "@/lib/db";
import type { TenantContext } from "@/lib/auth/context";
import { NotFoundError } from "@/lib/domain/errors";
import type { PlanId } from "@/lib/plans";

export interface TenantRow {
  id: string;
  name: string;
  plan: PlanId;
  default_interval_days: number;
  data_retention_months: number;
  is_demo: number;
  created_at: string;
}

export function getTenant(ctx: Pick<TenantContext, "tenantId">): TenantRow {
  const t = get<TenantRow>("SELECT * FROM tenants WHERE id = ?", ctx.tenantId);
  if (!t) throw new NotFoundError("Empresa");
  return t;
}

export function updateTenantSettings(
  ctx: TenantContext,
  input: { name: string; defaultIntervalDays: number; dataRetentionMonths: number },
): void {
  run(
    "UPDATE tenants SET name = ?, default_interval_days = ?, data_retention_months = ? WHERE id = ?",
    input.name,
    input.defaultIntervalDays,
    input.dataRetentionMonths,
    ctx.tenantId,
  );
}

export function setPlan(ctx: TenantContext, plan: PlanId): void {
  run("UPDATE tenants SET plan = ? WHERE id = ?", plan, ctx.tenantId);
}

/** Mensagens geradas por IA real no mês corrente (para limite do plano). */
export function aiMessagesThisMonth(ctx: TenantContext): number {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  return (
    get<{ n: number }>(
      "SELECT COUNT(*) AS n FROM contact_events WHERE tenant_id = ? AND type = 'message_generated_ai' AND created_at >= ?",
      ctx.tenantId,
      monthStart.toISOString(),
    )?.n ?? 0
  );
}
