import "server-only";
import { randomUUID } from "node:crypto";
import { all, run } from "@/lib/db";
import type { TenantContext } from "@/lib/auth/context";

/** Registra ações administrativas relevantes. Evita gravar dados pessoais no detalhe. */
export function logAudit(
  ctx: Pick<TenantContext, "tenantId" | "userId"> | null,
  action: string,
  entityType: string | null = null,
  entityId: string | null = null,
  detail: Record<string, unknown> | null = null,
): void {
  run(
    "INSERT INTO audit_log (id, tenant_id, user_id, action, entity_type, entity_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    randomUUID(),
    ctx?.tenantId ?? null,
    ctx?.userId ?? null,
    action,
    entityType,
    entityId,
    detail ? JSON.stringify(detail) : null,
    new Date().toISOString(),
  );
}

export interface AuditRow {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  detail: string | null;
  created_at: string;
  user_name: string | null;
}

export function listAudit(ctx: TenantContext, limit = 50): AuditRow[] {
  return all<AuditRow>(
    `SELECT a.id, a.action, a.entity_type, a.entity_id, a.detail, a.created_at, u.name AS user_name
       FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
      WHERE a.tenant_id = ?
      ORDER BY a.created_at DESC LIMIT ?`,
    ctx.tenantId,
    limit,
  );
}

export const AUDIT_LABELS: Record<string, string> = {
  "auth.login": "Entrou no sistema",
  "auth.logout": "Saiu do sistema",
  "auth.signup": "Criou a conta do salão",
  "client.create": "Cadastrou cliente",
  "client.update": "Editou cliente",
  "client.delete": "Excluiu cliente",
  "client.export": "Exportou dados de cliente",
  "client.opt_out": "Registrou pedido para não receber mensagens",
  "client.visit_add": "Registrou visita",
  "import.commit": "Importou planilha",
  "campaign.create": "Criou campanha",
  "campaign.status": "Alterou status da campanha",
  "campaign.delete": "Excluiu campanha",
  "campaign.approve_all": "Aprovou mensagens em lote",
  "settings.update": "Alterou configurações",
  "service.upsert": "Alterou serviço",
  "plan.change": "Alterou plano (simulação)",
  "data.export": "Exportou todos os dados",
  "data.retention_purge": "Excluiu clientes fora do prazo de retenção",
  "demo.load": "Carregou dados demonstrativos",
  "demo.remove": "Removeu dados demonstrativos",
};
