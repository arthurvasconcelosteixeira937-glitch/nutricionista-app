import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { CampaignFields } from "@/components/campaign-fields";
import { Alert, Badge, Card, CardBody, EmptyState, PageHeader, cn } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";
import { getAiStatus } from "@/lib/ai";
import { todayISO } from "@/lib/domain/dates";
import { CAMPAIGN_STATUS_LABELS, GOAL_LABELS, TONE_LABELS, type ContactStage } from "@/lib/domain/labels";
import { contactabilityOf } from "@/lib/domain/reactivation";
import { computeFunnel } from "@/lib/domain/reports";
import { getCampaign, listContacts, listEvents, metricRows } from "@/lib/repos/campaigns";
import { listServices } from "@/lib/repos/services";
import {
  approveAllAction,
  deleteCampaignAction,
  generateMessagesAction,
  setCampaignStatusAction,
  updateCampaignAction,
} from "../actions";
import { ContactCard } from "./contact-card";

export const metadata: Metadata = { title: "Campanha" };

const TABS: { key: string; label: string; stages: ContactStage[] | null }[] = [
  { key: "todos", label: "Todos", stages: null },
  { key: "preparar", label: "Sem mensagem", stages: ["selected"] },
  { key: "revisar", label: "Para revisar", stages: ["drafted"] },
  { key: "enviar", label: "Para enviar", stages: ["approved"] },
  { key: "resultado", label: "Aguardando resultado", stages: ["sent", "replied", "scheduled"] },
  { key: "encerrados", label: "Encerrados", stages: ["returned", "no_reply", "not_interested", "opted_out"] },
];

export default async function CampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string; criada?: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const sp = await searchParams;
  const campaign = getCampaign(session, id);
  if (!campaign) notFound();
  const contacts = listContacts(session, id);
  const events = listEvents(session, id);
  const services = listServices(session);
  const funnel = computeFunnel(metricRows(session, id));
  const ai = getAiStatus();
  const today = todayISO();
  const tab = TABS.find((t) => t.key === sp.aba) ?? TABS[0];
  const visible = tab.stages ? contacts.filter((c) => tab.stages!.includes(c.stage)) : contacts;
  const completed = campaign.status === "completed";

  const withoutMessage = contacts.filter(
    (c) => !c.message_text && !c.sent_at && contactabilityOf(c.consent_status, c.opted_out_at) === "ok",
  ).length;
  const drafted = contacts.filter((c) => c.stage === "drafted").length;
  const sentCount = contacts.filter((c) => c.sent_at).length;

  const steps = [
    { label: "Clientes", value: funnel.selected },
    { label: "Mensagens preparadas", value: funnel.prepared },
    { label: "Aprovadas", value: funnel.approved },
    { label: "Enviadas", value: funnel.sent },
    { label: "Respostas", value: funnel.replied },
    { label: "Agendamentos", value: funnel.scheduled },
    { label: "Retornos atribuídos", value: funnel.returnedAttributed },
  ];

  return (
    <>
      <PageHeader
        back={{ href: "/campanhas", label: "Campanhas" }}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {campaign.name}
            <Badge tone={campaign.status === "active" ? "brand" : campaign.status === "draft" ? "warning" : "neutral"}>
              {CAMPAIGN_STATUS_LABELS[campaign.status]}
            </Badge>
            {campaign.is_demo === 1 && <Badge tone="demo">Fictícia</Badge>}
          </span>
        }
        description={
          <>
            {GOAL_LABELS[campaign.goal]} · tom {TONE_LABELS[campaign.tone].toLowerCase()} · serviço:{" "}
            {campaign.service_focus ?? "da última visita"} · janela de atribuição: {campaign.attribution_window_days} dias
            {campaign.objective && <span className="mt-1 block">Objetivo: {campaign.objective}</span>}
          </>
        }
        actions={
          <>
            {campaign.status === "draft" && (
              <ActionForm action={setCampaignStatusAction} showSuccess={false}>
                <input type="hidden" name="campaignId" value={campaign.id} />
                <input type="hidden" name="status" value="active" />
                <SubmitButton variant="secondary">Colocar em andamento</SubmitButton>
              </ActionForm>
            )}
            {campaign.status === "active" && (
              <ActionForm
                action={setCampaignStatusAction}
                showSuccess={false}
                id="complete-campaign"
                confirm={{
                  title: "Concluir esta campanha?",
                  description:
                    "Mensagens não enviadas deixam de poder ser enviadas por esta campanha. Ainda será possível registrar resultados dos contatos já enviados.",
                  confirmLabel: "Concluir campanha",
                }}
              >
                <input type="hidden" name="campaignId" value={campaign.id} />
                <input type="hidden" name="status" value="completed" />
                <SubmitButton variant="secondary">Concluir campanha</SubmitButton>
              </ActionForm>
            )}
            {sentCount === 0 && (
              <ActionForm
                action={deleteCampaignAction}
                id="delete-campaign"
                confirm={{ title: "Excluir esta campanha?", description: "As mensagens preparadas serão descartadas.", confirmLabel: "Excluir", danger: true }}
              >
                <input type="hidden" name="campaignId" value={campaign.id} />
                <SubmitButton variant="ghost">Excluir</SubmitButton>
              </ActionForm>
            )}
          </>
        }
      />

      {sp.criada && (
        <div className="mb-4">
          <Alert tone="success" title="Campanha criada">
            Próximo passo: gere as mensagens e revise cada uma antes de aprovar.
          </Alert>
        </div>
      )}
      {campaign.is_demo === 1 && (
        <div className="mb-4">
          <Alert tone="demo">Campanha fictícia com resultados inventados, apenas para demonstrar os relatórios.</Alert>
        </div>
      )}

      <ol className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" aria-label="Andamento da campanha">
        {steps.map((s) => (
          <li key={s.label} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="text-lg font-semibold tabular-nums text-slate-900">{s.value}</p>
          </li>
        ))}
      </ol>

      {!completed && (
        <Card className="mb-6">
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-slate-700">
              <p className="font-medium text-slate-900">Mensagens</p>
              <p>
                {ai.mode === "demo" ? (
                  <span className="text-violet-800">{ai.label}. Configure ANTHROPIC_API_KEY para usar IA real.</span>
                ) : (
                  <>Sugestões geradas por {ai.label}.</>
                )}{" "}
                Nada é enviado automaticamente.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionForm action={generateMessagesAction}>
                <input type="hidden" name="campaignId" value={campaign.id} />
                <SubmitButton variant={withoutMessage > 0 ? "primary" : "secondary"} disabled={withoutMessage === 0} pendingLabel="Gerando mensagens…">
                  Gerar mensagens ({withoutMessage})
                </SubmitButton>
              </ActionForm>
              <ActionForm
                action={approveAllAction}
                id="approve-all"
                confirm={{
                  title: `Aprovar ${drafted} mensagem(ns)?`,
                  description:
                    "Confirme que você leu cada mensagem e que elas não prometem nada que o salão não ofereça (descontos, horários, preços).",
                  confirmLabel: "Revisei e aprovo",
                }}
              >
                <input type="hidden" name="campaignId" value={campaign.id} />
                <SubmitButton variant="secondary" disabled={drafted === 0} pendingLabel="Aprovando…">
                  Aprovar revisadas ({drafted})
                </SubmitButton>
              </ActionForm>
            </div>
          </CardBody>
        </Card>
      )}

      <nav aria-label="Filtrar contatos" className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const count = t.stages ? contacts.filter((c) => t.stages!.includes(c.stage)).length : contacts.length;
          return (
            <Link
              key={t.key}
              href={`/campanhas/${campaign.id}?aba=${t.key}`}
              aria-current={t.key === tab.key ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1 text-sm",
                t.key === tab.key ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
              )}
            >
              {t.label} ({count})
            </Link>
          );
        })}
      </nav>

      {visible.length === 0 ? (
        <Card>
          <EmptyState title="Nenhum contato nesta etapa" />
        </Card>
      ) : (
        <ul className="space-y-4">
          {visible.map((c) => (
            <ContactCard
              key={c.id}
              contact={c}
              campaign={campaign}
              events={events.filter((e) => e.campaign_contact_id === c.id)}
              services={services}
              today={today}
            />
          ))}
        </ul>
      )}

      {!completed && (
        <details className="mt-8 rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer select-none px-5 py-4 text-sm font-medium text-slate-900">Editar configurações da campanha</summary>
          <div className="border-t border-slate-100 px-5 py-4">
            <ActionForm action={updateCampaignAction} className="space-y-4">
              <input type="hidden" name="campaignId" value={campaign.id} />
              <CampaignFields services={services} salonName={session.tenantName} campaign={campaign} />
              <div className="flex justify-end">
                <SubmitButton>Salvar configurações</SubmitButton>
              </div>
            </ActionForm>
          </div>
        </details>
      )}
    </>
  );
}
