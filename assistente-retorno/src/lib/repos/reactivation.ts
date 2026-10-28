import "server-only";
import { all } from "@/lib/db";
import type { TenantContext } from "@/lib/auth/context";
import { todayISO } from "@/lib/domain/dates";
import { evaluateReactivation, type Contactability, type ReactivationResult } from "@/lib/domain/reactivation";
import type { CampaignStatus, ContactStage } from "@/lib/domain/labels";
import { listAllClientsWithLastVisit, type ClientWithLastVisit } from "./clients";
import { getTenant } from "./tenants";

export type ContactStatus = "never" | "in_campaign" | "awaiting" | "responded" | "closed";

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  never: "Nunca contatada por campanha",
  in_campaign: "Em campanha (ainda não enviada)",
  awaiting: "Mensagem enviada, aguardando",
  responded: "Respondeu / agendou",
  closed: "Contato encerrado",
};

interface LatestContact {
  client_id: string;
  stage: ContactStage;
  campaign_id: string;
  campaign_name: string;
  campaign_status: CampaignStatus;
  sent_at: string | null;
}

function latestContacts(ctx: TenantContext): Map<string, LatestContact> {
  const rows = all<LatestContact>(
    `SELECT cc.client_id, cc.stage, cc.campaign_id, ca.name AS campaign_name, ca.status AS campaign_status, cc.sent_at
       FROM campaign_contacts cc
       JOIN campaigns ca ON ca.id = cc.campaign_id AND ca.tenant_id = cc.tenant_id
      WHERE cc.tenant_id = ?
      ORDER BY cc.created_at ASC`,
    ctx.tenantId,
  );
  const map = new Map<string, LatestContact>();
  for (const r of rows) map.set(r.client_id, r); // a última sobrescreve
  return map;
}

function contactStatusOf(latest: LatestContact | undefined): ContactStatus {
  if (!latest) return "never";
  // Campanha concluída encerra o contato, qualquer que seja a última etapa registrada.
  if (latest.campaign_status === "completed") return "closed";
  if (["returned", "no_reply", "not_interested", "opted_out"].includes(latest.stage)) return "closed";
  if (latest.stage === "replied" || latest.stage === "scheduled") return "responded";
  return latest.sent_at ? "awaiting" : "in_campaign";
}

export interface ReactivationFilters {
  minDays?: number | null;
  serviceId?: string | null;
  lastVisitFrom?: string | null;
  lastVisitTo?: string | null;
  contactStatus?: ContactStatus | null;
  consent?: "ok" | "not_ok" | null;
}

export interface ReactivationCandidate {
  client: ClientWithLastVisit;
  evaluation: ReactivationResult;
  contactStatus: ContactStatus;
  latestCampaign: { id: string; name: string } | null;
}

export function listReactivationCandidates(
  ctx: TenantContext,
  filters: ReactivationFilters = {},
  today = todayISO(),
): ReactivationCandidate[] {
  const tenant = getTenant(ctx);
  const latest = latestContacts(ctx);
  const out: ReactivationCandidate[] = [];
  for (const client of listAllClientsWithLastVisit(ctx)) {
    const evaluation = evaluateReactivation(
      {
        consentStatus: client.consent_status,
        optedOutAt: client.opted_out_at,
        nextVisitDate: client.next_visit_date,
        lastVisitDate: client.last_visit_date,
        lastServiceName: client.last_service_name,
        serviceIntervalDays: client.service_interval,
      },
      { today, defaultIntervalDays: tenant.default_interval_days, minDaysOverride: filters.minDays ?? null },
    );
    if (!evaluation.due) continue;
    if (filters.serviceId && client.last_service_id !== filters.serviceId) continue;
    if (filters.lastVisitFrom && (client.last_visit_date ?? "") < filters.lastVisitFrom) continue;
    if (filters.lastVisitTo && (client.last_visit_date ?? "") > filters.lastVisitTo) continue;
    const l = latest.get(client.id);
    const contactStatus = contactStatusOf(l);
    if (filters.contactStatus && contactStatus !== filters.contactStatus) continue;
    if (filters.consent === "ok" && evaluation.contactability !== "ok") continue;
    if (filters.consent === "not_ok" && evaluation.contactability === "ok") continue;
    out.push({
      client,
      evaluation,
      contactStatus,
      latestCampaign: l ? { id: l.campaign_id, name: l.campaign_name } : null,
    });
  }
  out.sort((a, b) => (b.evaluation.daysOverdue ?? 0) - (a.evaluation.daysOverdue ?? 0));
  return out;
}

/** Clientes que podem entrar numa nova campanha: devidas, contatáveis e fora de campanha aberta. */
export function eligibleForNewCampaign(c: ReactivationCandidate): { eligible: boolean; reason: string | null } {
  const reasons: Record<Exclude<Contactability, "ok">, string> = {
    no_consent: "Sem autorização registrada para mensagens.",
    consent_denied: "A cliente não autorizou mensagens.",
    opted_out: "A cliente pediu para não receber mensagens.",
  };
  if (c.evaluation.contactability !== "ok") return { eligible: false, reason: reasons[c.evaluation.contactability] };
  if (c.contactStatus === "in_campaign" || c.contactStatus === "awaiting" || c.contactStatus === "responded") {
    return { eligible: false, reason: `Já está na campanha "${c.latestCampaign?.name}".` };
  }
  return { eligible: true, reason: null };
}
