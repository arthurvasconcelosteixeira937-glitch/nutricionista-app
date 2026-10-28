import "server-only";
import { randomUUID } from "node:crypto";
import { all, get, run, transaction } from "@/lib/db";
import type { TenantContext } from "@/lib/auth/context";
import { DomainError, NotFoundError } from "@/lib/domain/errors";
import { daysBetween, isValidISODate, timestampToLocalDate, todayISO } from "@/lib/domain/dates";
import { contactabilityOf } from "@/lib/domain/reactivation";
import { computeFunnel, type FunnelCounts } from "@/lib/domain/reports";
import type {
  CampaignGoal,
  CampaignStatus,
  ConsentStatus,
  ContactStage,
  MessageTone,
  SentChannel,
} from "@/lib/domain/labels";
import { checkMessage } from "@/lib/ai/guardrails";
import { generateMessage, getAiStatus, AiGenerationError } from "@/lib/ai";
import { getPlan } from "@/lib/plans";
import { addVisit, setOptOut } from "./clients";
import { aiMessagesThisMonth, getTenant } from "./tenants";
import { getService } from "./services";

export interface CampaignRow {
  id: string;
  name: string;
  objective: string | null;
  goal: CampaignGoal;
  tone: MessageTone;
  service_focus: string | null;
  salon_display_name: string;
  include_name: number;
  include_opt_out: number;
  extra_facts: string | null;
  attribution_window_days: number;
  status: CampaignStatus;
  is_demo: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignInput {
  name: string;
  objective: string | null;
  goal: CampaignGoal;
  tone: MessageTone;
  serviceFocus: string | null;
  salonDisplayName: string;
  includeName: boolean;
  includeOptOut: boolean;
  extraFacts: string | null;
  attributionWindowDays: number;
}

export interface ContactRow {
  id: string;
  campaign_id: string;
  client_id: string;
  stage: ContactStage;
  message_text: string | null;
  message_origin: "ai" | "demo_template" | "manual_edit" | null;
  message_model: string | null;
  message_warnings: string | null;
  message_generated_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  sent_channel: SentChannel | null;
  sent_data_source: string | null;
  replied_at: string | null;
  scheduled_at: string | null;
  scheduled_for: string | null;
  returned_at: string | null;
  revenue_cents: number | null;
  revenue_source: "manual" | "integration" | null;
  closed_reason: string | null;
  created_at: string;
  // da cliente
  client_name: string;
  client_phone: string;
  client_is_demo: number;
  consent_status: ConsentStatus;
  opted_out_at: string | null;
  last_visit_date: string | null;
  last_service_name: string | null;
  approved_by_name: string | null;
}

// ---------------------------------------------------------------------------
// Leitura

export function listCampaigns(ctx: TenantContext): (CampaignRow & { funnel: FunnelCounts })[] {
  const campaigns = all<CampaignRow>(
    "SELECT * FROM campaigns WHERE tenant_id = ? ORDER BY created_at DESC",
    ctx.tenantId,
  );
  return campaigns.map((c) => ({ ...c, funnel: computeFunnel(metricRows(ctx, c.id)) }));
}

export function getCampaign(ctx: TenantContext, id: string): CampaignRow | undefined {
  return get<CampaignRow>("SELECT * FROM campaigns WHERE tenant_id = ? AND id = ?", ctx.tenantId, id);
}

export function requireCampaign(ctx: TenantContext, id: string): CampaignRow {
  const c = getCampaign(ctx, id);
  if (!c) throw new NotFoundError("Campanha");
  return c;
}

const CONTACT_SELECT = `
  SELECT cc.*, cl.name AS client_name, cl.phone AS client_phone, cl.is_demo AS client_is_demo,
         cl.consent_status, cl.opted_out_at, u.name AS approved_by_name,
         lv.visit_date AS last_visit_date, lv.service_name AS last_service_name
    FROM campaign_contacts cc
    JOIN clients cl ON cl.id = cc.client_id AND cl.tenant_id = cc.tenant_id
    LEFT JOIN users u ON u.id = cc.approved_by
    LEFT JOIN visits lv ON lv.id = (
      SELECT v.id FROM visits v
       WHERE v.client_id = cl.id AND v.tenant_id = cl.tenant_id
         AND (cc.sent_at IS NULL OR v.visit_date <= substr(cc.sent_at, 1, 10))
       ORDER BY v.visit_date DESC, v.created_at DESC LIMIT 1)
   WHERE cc.tenant_id = ?`;

export function listContacts(ctx: TenantContext, campaignId: string): ContactRow[] {
  return all<ContactRow>(
    `${CONTACT_SELECT} AND cc.campaign_id = ? ORDER BY cl.name COLLATE NOCASE`,
    ctx.tenantId,
    campaignId,
  );
}

export function requireContact(ctx: TenantContext, contactId: string): ContactRow & { campaign: CampaignRow } {
  const contact = get<ContactRow>(`${CONTACT_SELECT} AND cc.id = ?`, ctx.tenantId, contactId);
  if (!contact) throw new NotFoundError("Contato da campanha");
  return { ...contact, campaign: requireCampaign(ctx, contact.campaign_id) };
}

export interface EventRow {
  id: string;
  campaign_contact_id: string;
  type: string;
  data_source: "manual" | "integration" | "system";
  detail: string | null;
  created_at: string;
  user_name: string | null;
}

export function listEvents(ctx: TenantContext, campaignId: string): EventRow[] {
  return all<EventRow>(
    `SELECT e.id, e.campaign_contact_id, e.type, e.data_source, e.detail, e.created_at, u.name AS user_name
       FROM contact_events e
       JOIN campaign_contacts cc ON cc.id = e.campaign_contact_id AND cc.tenant_id = e.tenant_id
       LEFT JOIN users u ON u.id = e.user_id
      WHERE e.tenant_id = ? AND cc.campaign_id = ?
      ORDER BY e.created_at ASC`,
    ctx.tenantId,
    campaignId,
  );
}

export function metricRows(ctx: TenantContext, campaignId?: string) {
  return all<{
    campaign_id: string;
    message_text: string | null;
    approved_at: string | null;
    sent_at: string | null;
    replied_at: string | null;
    scheduled_at: string | null;
    returned_at: string | null;
    revenue_cents: number | null;
    revenue_source: "manual" | "integration" | null;
    attribution_window_days: number;
  }>(
    `SELECT cc.campaign_id, cc.message_text, cc.approved_at, cc.sent_at, cc.replied_at, cc.scheduled_at,
            cc.returned_at, cc.revenue_cents, cc.revenue_source, ca.attribution_window_days
       FROM campaign_contacts cc JOIN campaigns ca ON ca.id = cc.campaign_id AND ca.tenant_id = cc.tenant_id
      WHERE cc.tenant_id = ?${campaignId ? " AND cc.campaign_id = ?" : ""}`,
    ...(campaignId ? [ctx.tenantId, campaignId] : [ctx.tenantId]),
  );
}

// ---------------------------------------------------------------------------
// Escrita

function addEvent(
  ctx: TenantContext,
  contactId: string,
  type: string,
  detail: Record<string, unknown> | null = null,
  source: "manual" | "integration" | "system" = "manual",
): void {
  run(
    "INSERT INTO contact_events (id, tenant_id, campaign_contact_id, type, data_source, detail, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    randomUUID(),
    ctx.tenantId,
    contactId,
    type,
    source,
    detail ? JSON.stringify(detail) : null,
    ctx.userId,
    new Date().toISOString(),
  );
}

function touchCampaign(ctx: TenantContext, campaignId: string): void {
  run("UPDATE campaigns SET updated_at = ? WHERE tenant_id = ? AND id = ?", new Date().toISOString(), ctx.tenantId, campaignId);
}

/** Verifica se a cliente pode entrar na campanha. Retorna o motivo quando não pode. */
function clientBlockReason(ctx: TenantContext, clientId: string): string | null {
  const client = get<{ name: string; consent_status: ConsentStatus; opted_out_at: string | null }>(
    "SELECT name, consent_status, opted_out_at FROM clients WHERE tenant_id = ? AND id = ?",
    ctx.tenantId,
    clientId,
  );
  if (!client) return "Cliente não encontrada.";
  if (contactabilityOf(client.consent_status, client.opted_out_at) !== "ok") {
    return `${client.name} não tem autorização ativa para receber mensagens.`;
  }
  const open = get<{ name: string }>(
    `SELECT ca.name FROM campaign_contacts cc JOIN campaigns ca ON ca.id = cc.campaign_id AND ca.tenant_id = cc.tenant_id
      WHERE cc.tenant_id = ? AND cc.client_id = ? AND ca.status != 'completed'
        AND cc.stage NOT IN ('returned', 'no_reply', 'not_interested', 'opted_out')`,
    ctx.tenantId,
    clientId,
  );
  if (open) return `${client.name} já está na campanha "${open.name}".`;
  return null;
}

export function createCampaign(ctx: TenantContext, input: CampaignInput, clientIds: string[]): string {
  const unique = [...new Set(clientIds)];
  if (unique.length === 0) throw new DomainError("Selecione ao menos uma cliente.");
  if (unique.length > 300) throw new DomainError("Selecione no máximo 300 clientes por campanha.");
  for (const id of unique) {
    const reason = clientBlockReason(ctx, id);
    if (reason) throw new DomainError(reason);
  }
  const id = randomUUID();
  const now = new Date().toISOString();
  transaction(() => {
    run(
      `INSERT INTO campaigns (id, tenant_id, name, objective, goal, tone, service_focus, salon_display_name, include_name,
                              include_opt_out, extra_facts, attribution_window_days, status, is_demo, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0, ?, ?, ?)`,
      id,
      ctx.tenantId,
      input.name,
      input.objective,
      input.goal,
      input.tone,
      input.serviceFocus,
      input.salonDisplayName,
      input.includeName,
      input.includeOptOut,
      input.extraFacts,
      input.attributionWindowDays,
      ctx.userId,
      now,
      now,
    );
    for (const clientId of unique) {
      const contactId = randomUUID();
      run(
        "INSERT INTO campaign_contacts (id, tenant_id, campaign_id, client_id, stage, created_at, updated_at) VALUES (?, ?, ?, ?, 'selected', ?, ?)",
        contactId,
        ctx.tenantId,
        id,
        clientId,
        now,
        now,
      );
      addEvent(ctx, contactId, "selected", null, "system");
    }
  });
  return id;
}

export function updateCampaignSettings(ctx: TenantContext, id: string, input: CampaignInput): void {
  const c = requireCampaign(ctx, id);
  if (c.status === "completed") throw new DomainError("Campanhas concluídas não podem ser editadas.");
  run(
    `UPDATE campaigns SET name = ?, objective = ?, goal = ?, tone = ?, service_focus = ?, salon_display_name = ?,
            include_name = ?, include_opt_out = ?, extra_facts = ?, attribution_window_days = ?, updated_at = ?
      WHERE tenant_id = ? AND id = ?`,
    input.name,
    input.objective,
    input.goal,
    input.tone,
    input.serviceFocus,
    input.salonDisplayName,
    input.includeName,
    input.includeOptOut,
    input.extraFacts,
    input.attributionWindowDays,
    new Date().toISOString(),
    ctx.tenantId,
    id,
  );
}

function assertCanActivate(ctx: TenantContext, excludeId: string): void {
  const plan = getPlan(getTenant(ctx).plan);
  const active =
    get<{ n: number }>(
      "SELECT COUNT(*) AS n FROM campaigns WHERE tenant_id = ? AND status = 'active' AND id != ?",
      ctx.tenantId,
      excludeId,
    )?.n ?? 0;
  if (active >= plan.limits.maxActiveCampaigns) {
    throw new DomainError(
      `O plano ${plan.name} permite ${plan.limits.maxActiveCampaigns} campanhas em andamento ao mesmo tempo. Conclua uma campanha antes.`,
    );
  }
}

export function setCampaignStatus(ctx: TenantContext, id: string, status: CampaignStatus): void {
  const c = requireCampaign(ctx, id);
  const allowed: Record<CampaignStatus, CampaignStatus[]> = {
    draft: ["active"],
    active: ["completed"],
    completed: [],
  };
  if (!allowed[c.status].includes(status)) {
    throw new DomainError("Mudança de status não permitida.");
  }
  if (status === "active") assertCanActivate(ctx, id);
  run(
    "UPDATE campaigns SET status = ?, updated_at = ? WHERE tenant_id = ? AND id = ?",
    status,
    new Date().toISOString(),
    ctx.tenantId,
    id,
  );
}

export function deleteCampaign(ctx: TenantContext, id: string): void {
  requireCampaign(ctx, id);
  const sent = get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM campaign_contacts WHERE tenant_id = ? AND campaign_id = ? AND sent_at IS NOT NULL",
    ctx.tenantId,
    id,
  );
  if ((sent?.n ?? 0) > 0) {
    throw new DomainError("Esta campanha já tem mensagens enviadas. Conclua-a em vez de excluir, para manter o histórico.");
  }
  run("DELETE FROM campaigns WHERE tenant_id = ? AND id = ?", ctx.tenantId, id);
}

function assertEditable(contact: ContactRow & { campaign: CampaignRow }): void {
  if (contact.campaign.status === "completed") throw new DomainError("A campanha já foi concluída.");
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full;
}

export interface GenerationReport {
  generated: number;
  failed: number;
  mode: "anthropic" | "demo";
  errors: string[];
}

/**
 * Gera mensagens para os contatos indicados (ou para todos sem mensagem).
 * Nenhuma mensagem é enviada: todas ficam aguardando revisão e aprovação.
 */
export async function generateMessages(
  ctx: TenantContext,
  campaignId: string,
  options: { contactIds?: string[]; overwrite?: boolean } = {},
): Promise<GenerationReport> {
  const campaign = requireCampaign(ctx, campaignId);
  if (campaign.status === "completed") throw new DomainError("A campanha já foi concluída.");
  const contacts = listContacts(ctx, campaignId);
  const targets = contacts.filter((c) => {
    if (options.contactIds && !options.contactIds.includes(c.id)) return false;
    if (c.sent_at) return false;
    if (contactabilityOf(c.consent_status, c.opted_out_at) !== "ok") return false;
    return options.overwrite ? true : !c.message_text;
  });
  if (options.contactIds && targets.length === 0) {
    throw new DomainError("Não há mensagem a gerar para este contato (já enviada ou sem autorização).");
  }

  const status = getAiStatus();
  if (status.mode === "anthropic") {
    const plan = getPlan(getTenant(ctx).plan);
    const used = aiMessagesThisMonth(ctx);
    if (used + targets.length > plan.limits.aiMessagesPerMonth) {
      throw new DomainError(
        `Limite de ${plan.limits.aiMessagesPerMonth} mensagens com IA por mês do plano ${plan.name} seria excedido (usadas: ${used}).`,
      );
    }
  }

  const today = todayISO();
  const report: GenerationReport = { generated: 0, failed: 0, mode: status.mode, errors: [] };
  const queue = [...targets];
  const worker = async () => {
    for (let contact = queue.shift(); contact; contact = queue.shift()) {
      try {
        const msg = await generateMessage({
          seed: contact.id,
          clientFirstName: campaign.include_name ? firstName(contact.client_name) : null,
          salonName: campaign.salon_display_name,
          serviceName: campaign.service_focus ?? contact.last_service_name,
          daysSinceLastVisit: contact.last_visit_date ? daysBetween(contact.last_visit_date, today) : null,
          tone: campaign.tone,
          goal: campaign.goal,
          includeOptOut: campaign.include_opt_out === 1,
          extraFacts: campaign.extra_facts,
        });
        const warnings = checkMessage(msg.text, campaign.extra_facts);
        const now = new Date().toISOString();
        run(
          `UPDATE campaign_contacts SET message_text = ?, message_origin = ?, message_model = ?, message_warnings = ?,
                  message_generated_at = ?, approved_at = NULL, approved_by = NULL, stage = 'drafted', updated_at = ?
            WHERE tenant_id = ? AND id = ? AND sent_at IS NULL`,
          msg.text,
          msg.origin,
          msg.model,
          JSON.stringify(warnings),
          now,
          now,
          ctx.tenantId,
          contact.id,
        );
        addEvent(
          ctx,
          contact.id,
          msg.origin === "ai" ? "message_generated_ai" : "message_generated_demo",
          { model: msg.model },
          "system",
        );
        report.generated++;
      } catch (err) {
        report.failed++;
        report.errors.push(
          err instanceof AiGenerationError ? `${contact.client_name}: ${err.message}` : `${contact.client_name}: erro inesperado.`,
        );
        if (!(err instanceof AiGenerationError)) console.error("[campanhas] falha ao gerar", err);
      }
    }
  };
  await Promise.all(Array.from({ length: status.mode === "anthropic" ? 3 : 1 }, worker));
  touchCampaign(ctx, campaignId);
  return report;
}

export function editMessage(ctx: TenantContext, contactId: string, text: string): string[] {
  const contact = requireContact(ctx, contactId);
  assertEditable(contact);
  if (contact.sent_at) throw new DomainError("A mensagem já foi enviada e não pode ser alterada.");
  const warnings = checkMessage(text, contact.campaign.extra_facts);
  const now = new Date().toISOString();
  run(
    `UPDATE campaign_contacts SET message_text = ?, message_origin = 'manual_edit', message_warnings = ?,
            approved_at = NULL, approved_by = NULL, stage = 'drafted', updated_at = ?
      WHERE tenant_id = ? AND id = ?`,
    text,
    JSON.stringify(warnings),
    now,
    ctx.tenantId,
    contactId,
  );
  addEvent(ctx, contactId, "message_edited");
  return warnings;
}

export function approveMessage(ctx: TenantContext, contactId: string): void {
  const contact = requireContact(ctx, contactId);
  assertEditable(contact);
  if (!contact.message_text) throw new DomainError("Não há mensagem para aprovar.");
  if (contact.sent_at) throw new DomainError("A mensagem já foi enviada.");
  if (contactabilityOf(contact.consent_status, contact.opted_out_at) !== "ok") {
    throw new DomainError("A cliente não tem autorização ativa para receber mensagens.");
  }
  const now = new Date().toISOString();
  run(
    "UPDATE campaign_contacts SET approved_at = ?, approved_by = ?, stage = 'approved', updated_at = ? WHERE tenant_id = ? AND id = ?",
    now,
    ctx.userId,
    now,
    ctx.tenantId,
    contactId,
  );
  addEvent(ctx, contactId, "message_approved");
}

/** Aprova em lote as mensagens já preparadas, após confirmação explícita de revisão na interface. */
export function approveAllDrafted(ctx: TenantContext, campaignId: string): number {
  const campaign = requireCampaign(ctx, campaignId);
  if (campaign.status === "completed") throw new DomainError("A campanha já foi concluída.");
  const drafted = listContacts(ctx, campaignId).filter(
    (c) => c.stage === "drafted" && c.message_text && contactabilityOf(c.consent_status, c.opted_out_at) === "ok",
  );
  transaction(() => {
    for (const c of drafted) approveMessage(ctx, c.id);
  });
  return drafted.length;
}

export function markSent(ctx: TenantContext, contactId: string, channel: SentChannel): void {
  const contact = requireContact(ctx, contactId);
  assertEditable(contact);
  if (!contact.approved_at) throw new DomainError("Aprove a mensagem antes de registrar o envio.");
  if (contact.sent_at) throw new DomainError("O envio já foi registrado.");
  if (contactabilityOf(contact.consent_status, contact.opted_out_at) !== "ok") {
    throw new DomainError("A cliente não tem autorização ativa para receber mensagens.");
  }
  transaction(() => {
    if (contact.campaign.status === "draft") {
      setCampaignStatus(ctx, contact.campaign_id, "active");
      addEvent(ctx, contactId, "campaign_activated", null, "system");
    }
    const now = new Date().toISOString();
    run(
      `UPDATE campaign_contacts SET sent_at = ?, sent_channel = ?, sent_data_source = 'manual', stage = 'sent', updated_at = ?
        WHERE tenant_id = ? AND id = ?`,
      now,
      channel,
      now,
      ctx.tenantId,
      contactId,
    );
    addEvent(ctx, contactId, "sent", { channel });
  });
}

export type OutcomeType = "replied" | "scheduled" | "returned" | "no_reply" | "not_interested" | "opted_out";

export interface OutcomeInput {
  type: OutcomeType;
  date: string;
  scheduledFor?: string | null;
  amountCents?: number | null;
  serviceId?: string | null;
  createVisit?: boolean;
  note?: string | null;
}

export function registerOutcome(ctx: TenantContext, contactId: string, input: OutcomeInput): void {
  const contact = requireContact(ctx, contactId);
  if (!contact.sent_at) throw new DomainError("Registre o envio da mensagem antes do resultado.");
  if (!isValidISODate(input.date)) throw new DomainError("Data inválida.");
  const sentDate = timestampToLocalDate(contact.sent_at);
  const today = todayISO();
  if (input.date < sentDate) throw new DomainError("A data do resultado não pode ser anterior ao envio.");
  if (input.date > today) throw new DomainError("A data do resultado não pode estar no futuro.");
  if (input.amountCents != null && input.type !== "returned") {
    throw new DomainError("Valor de venda só pode ser registrado junto com o retorno da cliente.");
  }
  const now = new Date().toISOString();
  const rank: Record<string, number> = { sent: 0, replied: 1, scheduled: 2, returned: 3 };
  const upgrade = (stage: ContactStage) => ((rank[stage] ?? 0) >= (rank[contact.stage] ?? 0) ? stage : contact.stage);

  transaction(() => {
    switch (input.type) {
      case "replied":
        run(
          "UPDATE campaign_contacts SET replied_at = ?, stage = ?, closed_reason = NULL, updated_at = ? WHERE tenant_id = ? AND id = ?",
          input.date,
          upgrade("replied"),
          now,
          ctx.tenantId,
          contactId,
        );
        break;
      case "scheduled": {
        if (input.scheduledFor && !isValidISODate(input.scheduledFor)) throw new DomainError("Data do agendamento inválida.");
        if (input.scheduledFor && input.scheduledFor < input.date) {
          throw new DomainError("A data agendada não pode ser anterior ao registro do agendamento.");
        }
        run(
          `UPDATE campaign_contacts SET replied_at = COALESCE(replied_at, ?), scheduled_at = ?, scheduled_for = ?, stage = ?,
                  closed_reason = NULL, updated_at = ?
            WHERE tenant_id = ? AND id = ?`,
          input.date,
          input.date,
          input.scheduledFor ?? null,
          upgrade("scheduled"),
          now,
          ctx.tenantId,
          contactId,
        );
        if (input.scheduledFor && input.scheduledFor >= today) {
          run(
            "UPDATE clients SET next_visit_date = ?, updated_at = ? WHERE tenant_id = ? AND id = ?",
            input.scheduledFor,
            now,
            ctx.tenantId,
            contact.client_id,
          );
        }
        break;
      }
      case "returned": {
        if (input.serviceId && !getService(ctx, input.serviceId)) throw new NotFoundError("Serviço");
        run(
          `UPDATE campaign_contacts SET returned_at = ?, revenue_cents = ?, revenue_source = ?, stage = 'returned',
                  closed_reason = NULL, updated_at = ?
            WHERE tenant_id = ? AND id = ?`,
          input.date,
          input.amountCents ?? null,
          input.amountCents != null ? "manual" : null,
          now,
          ctx.tenantId,
          contactId,
        );
        if (input.createVisit !== false) {
          addVisit(ctx, contact.client_id, {
            serviceId: input.serviceId ?? null,
            visitDate: input.date,
            amountCents: input.amountCents ?? null,
            origin: "campaign",
            campaignId: contact.campaign_id,
          });
        }
        break;
      }
      case "no_reply":
      case "not_interested":
        if (contact.stage === "returned") throw new DomainError("O retorno da cliente já foi registrado.");
        run(
          "UPDATE campaign_contacts SET stage = ?, closed_reason = ?, updated_at = ? WHERE tenant_id = ? AND id = ?",
          input.type,
          input.type,
          now,
          ctx.tenantId,
          contactId,
        );
        break;
      case "opted_out":
        setOptOut(ctx, contact.client_id, input.note ?? "Pedido registrado em campanha");
        run(
          "UPDATE campaign_contacts SET stage = 'opted_out', closed_reason = 'opted_out', updated_at = ? WHERE tenant_id = ? AND id = ?",
          now,
          ctx.tenantId,
          contactId,
        );
        break;
    }
    addEvent(ctx, contactId, `outcome_${input.type}`, {
      date: input.date,
      scheduledFor: input.scheduledFor ?? null,
      amountCents: input.amountCents ?? null,
      note: input.note ?? null,
    });
    touchCampaign(ctx, contact.campaign_id);
  });
}

export function removeContact(ctx: TenantContext, contactId: string): void {
  const contact = requireContact(ctx, contactId);
  assertEditable(contact);
  if (contact.sent_at) throw new DomainError("Contatos com envio registrado não podem ser removidos.");
  run("DELETE FROM campaign_contacts WHERE tenant_id = ? AND id = ?", ctx.tenantId, contactId);
}
