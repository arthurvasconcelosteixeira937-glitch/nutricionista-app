import "server-only";
import { all, get, run, transaction } from "@/lib/db";
import type { TenantContext } from "@/lib/auth/context";
import { DomainError } from "@/lib/domain/errors";
import { addDays, todayISO } from "@/lib/domain/dates";
import { getTenant } from "./tenants";

export function requireOwner(ctx: TenantContext): void {
  if (ctx.role !== "owner") throw new DomainError("Apenas a pessoa responsável pela conta pode fazer isso.");
}

/** Exportação completa dos dados da empresa (portabilidade / backup). */
export function exportTenantData(ctx: TenantContext) {
  requireOwner(ctx);
  const t = ctx.tenantId;
  return {
    exportado_em: new Date().toISOString(),
    empresa: getTenant(ctx),
    servicos: all("SELECT * FROM services WHERE tenant_id = ?", t),
    clientes: all("SELECT * FROM clients WHERE tenant_id = ?", t),
    visitas: all("SELECT * FROM visits WHERE tenant_id = ?", t),
    campanhas: all("SELECT * FROM campaigns WHERE tenant_id = ?", t),
    contatos_campanha: all("SELECT * FROM campaign_contacts WHERE tenant_id = ?", t),
    eventos: all("SELECT * FROM contact_events WHERE tenant_id = ?", t),
    registro_de_acoes: all("SELECT * FROM audit_log WHERE tenant_id = ?", t),
  };
}

/** Clientes sem visita (nem cadastro recente) além do prazo de retenção configurado. */
export function retentionCandidates(ctx: TenantContext): { id: string; name: string; last: string }[] {
  const tenant = getTenant(ctx);
  const cutoff = addDays(todayISO(), -Math.round(tenant.data_retention_months * 30.44));
  return all<{ id: string; name: string; last: string }>(
    `SELECT c.id, c.name, COALESCE(MAX(v.visit_date), substr(c.created_at, 1, 10)) AS last
       FROM clients c LEFT JOIN visits v ON v.client_id = c.id AND v.tenant_id = c.tenant_id
      WHERE c.tenant_id = ?
      GROUP BY c.id
     HAVING last < ?
      ORDER BY last`,
    ctx.tenantId,
    cutoff,
  );
}

export function purgeRetention(ctx: TenantContext): number {
  requireOwner(ctx);
  const ids = retentionCandidates(ctx).map((r) => r.id);
  transaction(() => {
    for (const id of ids) run("DELETE FROM clients WHERE tenant_id = ? AND id = ?", ctx.tenantId, id);
  });
  return ids.length;
}

/** Exclui a empresa e todos os dados vinculados. Usuários sem outra empresa também são removidos. */
export function deleteTenant(ctx: TenantContext): void {
  requireOwner(ctx);
  transaction(() => {
    const users = all<{ user_id: string }>("SELECT user_id FROM memberships WHERE tenant_id = ?", ctx.tenantId);
    run("DELETE FROM tenants WHERE id = ?", ctx.tenantId);
    for (const u of users) {
      const other = get("SELECT 1 AS x FROM memberships WHERE user_id = ?", u.user_id);
      if (!other) run("DELETE FROM users WHERE id = ?", u.user_id);
    }
  });
}
