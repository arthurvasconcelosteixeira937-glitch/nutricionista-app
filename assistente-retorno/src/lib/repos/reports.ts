import "server-only";
import { get } from "@/lib/db";
import type { TenantContext } from "@/lib/auth/context";
import { computeFunnel, funnelRates, type FunnelCounts, type Rate } from "@/lib/domain/reports";
import { listCampaigns, metricRows, type CampaignRow } from "./campaigns";
import { countClients } from "./clients";
import { listReactivationCandidates } from "./reactivation";

export interface CampaignReport {
  campaign: CampaignRow;
  funnel: FunnelCounts;
  rates: Rate[];
}

export interface ReportData {
  overall: FunnelCounts;
  overallRates: Rate[];
  campaigns: CampaignReport[];
}

export function getReport(ctx: TenantContext): ReportData {
  const overall = computeFunnel(metricRows(ctx));
  return {
    overall,
    overallRates: funnelRates(overall),
    campaigns: listCampaigns(ctx).map((c) => ({ campaign: c, funnel: c.funnel, rates: funnelRates(c.funnel) })),
  };
}

export interface DashboardData {
  totalClients: number;
  needFollowUp: number;
  needFollowUpContactable: number;
  messagesPrepared: number;
  messagesAwaitingApproval: number;
  activeCampaigns: number;
  draftCampaigns: number;
  overall: FunnelCounts;
  recentCampaigns: CampaignReport[];
}

export function getDashboard(ctx: TenantContext): DashboardData {
  const candidates = listReactivationCandidates(ctx);
  const campaigns = listCampaigns(ctx);
  const pending = get<{ prepared: number; awaiting: number }>(
    `SELECT SUM(CASE WHEN cc.message_text IS NOT NULL AND cc.sent_at IS NULL THEN 1 ELSE 0 END) AS prepared,
            SUM(CASE WHEN cc.stage = 'drafted' THEN 1 ELSE 0 END) AS awaiting
       FROM campaign_contacts cc JOIN campaigns ca ON ca.id = cc.campaign_id AND ca.tenant_id = cc.tenant_id
      WHERE cc.tenant_id = ? AND ca.status != 'completed'`,
    ctx.tenantId,
  );
  const overall = computeFunnel(metricRows(ctx));
  return {
    totalClients: countClients(ctx),
    needFollowUp: candidates.length,
    needFollowUpContactable: candidates.filter((c) => c.evaluation.contactability === "ok").length,
    messagesPrepared: pending?.prepared ?? 0,
    messagesAwaitingApproval: pending?.awaiting ?? 0,
    activeCampaigns: campaigns.filter((c) => c.status === "active").length,
    draftCampaigns: campaigns.filter((c) => c.status === "draft").length,
    overall,
    recentCampaigns: campaigns.slice(0, 4).map((c) => ({ campaign: c, funnel: c.funnel, rates: funnelRates(c.funnel) })),
  };
}
