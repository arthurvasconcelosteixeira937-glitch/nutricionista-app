import "server-only";
import { randomUUID } from "node:crypto";
import { all, get, run, transaction } from "@/lib/db";
import type { TenantContext } from "@/lib/auth/context";
import { DomainError, NotFoundError } from "@/lib/domain/errors";
import type { ConsentStatus } from "@/lib/domain/labels";
import { getPlan } from "@/lib/plans";
import { getTenant } from "./tenants";
import { getService } from "./services";

export interface ClientRow {
  id: string;
  name: string;
  phone: string;
  notes: string | null;
  contact_source: string | null;
  legal_basis: string | null;
  consent_status: ConsentStatus;
  consent_recorded_at: string | null;
  opted_out_at: string | null;
  opt_out_note: string | null;
  next_visit_date: string | null;
  is_demo: number;
  created_at: string;
  updated_at: string;
}

export interface ClientWithLastVisit extends ClientRow {
  last_visit_date: string | null;
  last_service_name: string | null;
  last_service_id: string | null;
  service_interval: number | null;
}

/** SELECT base com a última visita de cada cliente. O filtro de tenant fica em WHERE c.tenant_id = ?. */
export const CLIENT_WITH_LAST_VISIT_SQL = `
  SELECT c.*, lv.visit_date AS last_visit_date, lv.service_name AS last_service_name,
         lv.service_id AS last_service_id, s.return_interval_days AS service_interval
    FROM clients c
    LEFT JOIN visits lv ON lv.id = (
      SELECT v.id FROM visits v
       WHERE v.client_id = c.id AND v.tenant_id = c.tenant_id
       ORDER BY v.visit_date DESC, v.created_at DESC LIMIT 1)
    LEFT JOIN services s ON s.id = lv.service_id AND s.tenant_id = c.tenant_id
   WHERE c.tenant_id = ?`;

export interface ClientListFilters {
  q?: string;
  consent?: ConsentStatus | "opted_out" | "";
  page?: number;
}

export const PAGE_SIZE = 25;

export function listClients(
  ctx: TenantContext,
  filters: ClientListFilters = {},
): { rows: ClientWithLastVisit[]; total: number } {
  const where: string[] = [];
  const params: (string | number)[] = [ctx.tenantId];
  if (filters.q) {
    const digits = filters.q.replace(/\D/g, "");
    if (digits.length >= 3) {
      where.push("(c.name LIKE ? OR c.phone LIKE ?)");
      params.push(`%${filters.q}%`, `%${digits}%`);
    } else {
      where.push("c.name LIKE ?");
      params.push(`%${filters.q}%`);
    }
  }
  if (filters.consent === "opted_out") where.push("c.opted_out_at IS NOT NULL");
  else if (filters.consent) {
    where.push("c.consent_status = ? AND c.opted_out_at IS NULL");
    params.push(filters.consent);
  }
  const extra = where.length ? ` AND ${where.join(" AND ")}` : "";
  const total =
    get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM (${CLIENT_WITH_LAST_VISIT_SQL}${extra})`,
      ...params,
    )?.n ?? 0;
  const page = Math.max(1, filters.page ?? 1);
  const rows = all<ClientWithLastVisit>(
    `${CLIENT_WITH_LAST_VISIT_SQL}${extra} ORDER BY c.name COLLATE NOCASE LIMIT ? OFFSET ?`,
    ...params,
    PAGE_SIZE,
    (page - 1) * PAGE_SIZE,
  );
  return { rows, total };
}

export function listAllClientsWithLastVisit(ctx: TenantContext): ClientWithLastVisit[] {
  return all<ClientWithLastVisit>(CLIENT_WITH_LAST_VISIT_SQL, ctx.tenantId);
}

export function getClient(ctx: TenantContext, id: string): ClientWithLastVisit | undefined {
  return get<ClientWithLastVisit>(`${CLIENT_WITH_LAST_VISIT_SQL} AND c.id = ?`, ctx.tenantId, id);
}

export function requireClient(ctx: TenantContext, id: string): ClientWithLastVisit {
  const c = getClient(ctx, id);
  if (!c) throw new NotFoundError("Cliente");
  return c;
}

export function countClients(ctx: TenantContext): number {
  return get<{ n: number }>("SELECT COUNT(*) AS n FROM clients WHERE tenant_id = ?", ctx.tenantId)?.n ?? 0;
}

export function existingPhones(ctx: TenantContext): Set<string> {
  return new Set(
    all<{ phone: string }>("SELECT phone FROM clients WHERE tenant_id = ?", ctx.tenantId).map((r) => r.phone),
  );
}

export function assertClientCapacity(ctx: TenantContext, adding: number): void {
  const plan = getPlan(getTenant(ctx).plan);
  const current = countClients(ctx);
  if (current + adding > plan.limits.maxClients) {
    throw new DomainError(
      `O plano ${plan.name} permite até ${plan.limits.maxClients} clientes (atualmente ${current}).`,
    );
  }
}

export interface ClientInput {
  name: string;
  phone: string; // já normalizado (E.164)
  notes: string | null;
  contactSource: string | null;
  legalBasis: string | null;
  consentStatus: ConsentStatus;
  nextVisitDate: string | null;
}

export interface FirstVisitInput {
  serviceId: string | null;
  visitDate: string;
  amountCents: number | null;
}

function assertPhoneFree(ctx: TenantContext, phone: string, exceptId?: string): void {
  const clash = get<{ id: string; name: string }>(
    "SELECT id, name FROM clients WHERE tenant_id = ? AND phone = ?",
    ctx.tenantId,
    phone,
  );
  if (clash && clash.id !== exceptId) {
    throw new DomainError(`Este telefone já está cadastrado para ${clash.name}.`);
  }
}

export function createClient(ctx: TenantContext, input: ClientInput, visit: FirstVisitInput | null): string {
  assertClientCapacity(ctx, 1);
  assertPhoneFree(ctx, input.phone);
  const id = randomUUID();
  const now = new Date().toISOString();
  transaction(() => {
    run(
      `INSERT INTO clients (id, tenant_id, name, phone, notes, contact_source, legal_basis, consent_status,
                            consent_recorded_at, next_visit_date, is_demo, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      id,
      ctx.tenantId,
      input.name,
      input.phone,
      input.notes,
      input.contactSource,
      input.legalBasis,
      input.consentStatus,
      input.consentStatus === "not_informed" ? null : now,
      input.nextVisitDate,
      now,
      now,
    );
    if (visit) addVisit(ctx, id, { ...visit, origin: "manual", campaignId: null });
  });
  return id;
}

export function updateClient(ctx: TenantContext, id: string, input: ClientInput): void {
  const current = requireClient(ctx, id);
  assertPhoneFree(ctx, input.phone, id);
  const now = new Date().toISOString();
  const consentChanged = current.consent_status !== input.consentStatus;
  run(
    `UPDATE clients SET name = ?, phone = ?, notes = ?, contact_source = ?, legal_basis = ?, consent_status = ?,
            consent_recorded_at = ?, next_visit_date = ?, updated_at = ?
      WHERE tenant_id = ? AND id = ?`,
    input.name,
    input.phone,
    input.notes,
    input.contactSource,
    input.legalBasis,
    input.consentStatus,
    consentChanged ? (input.consentStatus === "not_informed" ? null : now) : current.consent_recorded_at,
    input.nextVisitDate,
    now,
    ctx.tenantId,
    id,
  );
}

export function addVisit(
  ctx: TenantContext,
  clientId: string,
  visit: FirstVisitInput & { origin: "manual" | "import" | "campaign"; campaignId: string | null },
): void {
  requireClient(ctx, clientId);
  const service = visit.serviceId ? getService(ctx, visit.serviceId) : undefined;
  if (visit.serviceId && !service) throw new NotFoundError("Serviço");
  run(
    `INSERT INTO visits (id, tenant_id, client_id, service_id, service_name, visit_date, amount_cents, origin, campaign_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    randomUUID(),
    ctx.tenantId,
    clientId,
    service?.id ?? null,
    service?.name ?? null,
    visit.visitDate,
    visit.amountCents,
    visit.origin,
    visit.campaignId,
    new Date().toISOString(),
  );
  // Se a visita registrada cumpre o agendamento futuro, limpa a "próxima visita".
  run(
    "UPDATE clients SET next_visit_date = NULL, updated_at = ? WHERE tenant_id = ? AND id = ? AND next_visit_date IS NOT NULL AND next_visit_date <= ?",
    new Date().toISOString(),
    ctx.tenantId,
    clientId,
    visit.visitDate,
  );
}

export interface VisitRow {
  id: string;
  service_name: string | null;
  visit_date: string;
  amount_cents: number | null;
  origin: "manual" | "import" | "campaign";
  campaign_id: string | null;
  campaign_name: string | null;
}

export function listVisits(ctx: TenantContext, clientId: string): VisitRow[] {
  return all<VisitRow>(
    `SELECT v.id, v.service_name, v.visit_date, v.amount_cents, v.origin, v.campaign_id, ca.name AS campaign_name
       FROM visits v LEFT JOIN campaigns ca ON ca.id = v.campaign_id AND ca.tenant_id = v.tenant_id
      WHERE v.tenant_id = ? AND v.client_id = ?
      ORDER BY v.visit_date DESC, v.created_at DESC`,
    ctx.tenantId,
    clientId,
  );
}

export function deleteVisit(ctx: TenantContext, clientId: string, visitId: string): void {
  const r = run("DELETE FROM visits WHERE tenant_id = ? AND client_id = ? AND id = ?", ctx.tenantId, clientId, visitId);
  if (r.changes === 0) throw new NotFoundError("Visita");
}

/** Registra pedido de não receber mensagens. Encerra contatos ainda não enviados. */
export function setOptOut(ctx: TenantContext, clientId: string, note: string | null): void {
  requireClient(ctx, clientId);
  const now = new Date().toISOString();
  transaction(() => {
    run(
      "UPDATE clients SET opted_out_at = ?, opt_out_note = ?, updated_at = ? WHERE tenant_id = ? AND id = ?",
      now,
      note,
      now,
      ctx.tenantId,
      clientId,
    );
    run(
      `UPDATE campaign_contacts SET stage = 'opted_out', closed_reason = 'opted_out', updated_at = ?
        WHERE tenant_id = ? AND client_id = ? AND sent_at IS NULL`,
      now,
      ctx.tenantId,
      clientId,
    );
  });
}

export function clearOptOut(ctx: TenantContext, clientId: string): void {
  requireClient(ctx, clientId);
  run(
    "UPDATE clients SET opted_out_at = NULL, opt_out_note = NULL, updated_at = ? WHERE tenant_id = ? AND id = ?",
    new Date().toISOString(),
    ctx.tenantId,
    clientId,
  );
}

export function deleteClient(ctx: TenantContext, id: string): void {
  const r = run("DELETE FROM clients WHERE tenant_id = ? AND id = ?", ctx.tenantId, id);
  if (r.changes === 0) throw new NotFoundError("Cliente");
}

export interface ClientCampaignHistoryRow {
  campaign_id: string;
  campaign_name: string;
  stage: string;
  sent_at: string | null;
  returned_at: string | null;
}

export function clientCampaignHistory(ctx: TenantContext, clientId: string): ClientCampaignHistoryRow[] {
  return all<ClientCampaignHistoryRow>(
    `SELECT cc.campaign_id, ca.name AS campaign_name, cc.stage, cc.sent_at, cc.returned_at
       FROM campaign_contacts cc JOIN campaigns ca ON ca.id = cc.campaign_id AND ca.tenant_id = cc.tenant_id
      WHERE cc.tenant_id = ? AND cc.client_id = ?
      ORDER BY cc.created_at DESC`,
    ctx.tenantId,
    clientId,
  );
}

/** Dados de uma cliente para atender pedido de acesso/portabilidade (LGPD art. 18). */
export function exportClientData(ctx: TenantContext, id: string) {
  const client = requireClient(ctx, id);
  return {
    exportado_em: new Date().toISOString(),
    cliente: client,
    visitas: listVisits(ctx, id),
    contatos_em_campanhas: all(
      `SELECT cc.campaign_id, ca.name AS campanha, cc.stage, cc.message_text, cc.approved_at, cc.sent_at,
              cc.sent_channel, cc.replied_at, cc.scheduled_at, cc.scheduled_for, cc.returned_at, cc.revenue_cents
         FROM campaign_contacts cc JOIN campaigns ca ON ca.id = cc.campaign_id AND ca.tenant_id = cc.tenant_id
        WHERE cc.tenant_id = ? AND cc.client_id = ?`,
      ctx.tenantId,
      id,
    ),
  };
}
