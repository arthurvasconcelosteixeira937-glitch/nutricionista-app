import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { StageBadge } from "@/components/badges";
import { Alert, Badge, Select, Textarea } from "@/components/ui";
import { whatsappClickToChatUrl } from "@/lib/channels";
import { attributionStatus } from "@/lib/domain/attribution";
import { formatDateBR, formatDateTimeBR, timestampToLocalDate } from "@/lib/domain/dates";
import { CHANNEL_LABELS, type SentChannel } from "@/lib/domain/labels";
import { formatBRL } from "@/lib/domain/money";
import { formatPhoneBR } from "@/lib/domain/phone";
import { contactabilityOf } from "@/lib/domain/reactivation";
import type { CampaignRow, ContactRow, EventRow } from "@/lib/repos/campaigns";
import type { ServiceRow } from "@/lib/repos/services";
import {
  approveMessageAction,
  editMessageAction,
  generateMessagesAction,
  markSentAction,
  registerOutcomeAction,
  removeContactAction,
} from "../actions";
import { CopyButton } from "./copy-button";
import { OutcomeForm } from "./outcome-form";

const ORIGIN_LABELS = {
  ai: "Sugerida por IA",
  demo_template: "Sugerida pelo modo demonstrativo (modelo de texto, sem IA)",
  manual_edit: "Editada manualmente",
} as const;

const EVENT_LABELS: Record<string, string> = {
  selected: "Incluída na campanha",
  message_generated_ai: "Mensagem sugerida por IA",
  message_generated_demo: "Mensagem sugerida (modo demonstrativo)",
  message_edited: "Mensagem editada",
  message_approved: "Mensagem aprovada",
  campaign_activated: "Campanha colocada em andamento",
  sent: "Envio registrado",
  outcome_replied: "Resposta registrada",
  outcome_scheduled: "Agendamento registrado",
  outcome_returned: "Retorno registrado",
  outcome_no_reply: "Encerrado sem resposta",
  outcome_not_interested: "Encerrado: sem interesse",
  outcome_opted_out: "Pediu para não receber mensagens",
};

const SOURCE_LABELS = { manual: "registro manual", integration: "integração", system: "sistema" } as const;

export function ContactCard({
  contact,
  campaign,
  events,
  services,
  today,
}: {
  contact: ContactRow;
  campaign: CampaignRow;
  events: EventRow[];
  services: ServiceRow[];
  today: string;
}) {
  const completed = campaign.status === "completed";
  const contactable = contactabilityOf(contact.consent_status, contact.opted_out_at) === "ok";
  const warnings: string[] = contact.message_warnings ? JSON.parse(contact.message_warnings) : [];
  const sent = !!contact.sent_at;
  const attribution = attributionStatus({
    sentAt: contact.sent_at,
    returnedAt: contact.returned_at,
    windowDays: campaign.attribution_window_days,
  });
  const defaultServiceId = services.find((s) => s.name === (campaign.service_focus ?? contact.last_service_name))?.id ?? null;

  return (
    <li className="rounded-xl border border-slate-200 bg-white shadow-sm" data-testid="contact-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <div className="min-w-0">
          <Link href={`/clientes/${contact.client_id}`} className="font-semibold text-slate-900 hover:underline">
            {contact.client_name}
          </Link>
          <p className="text-xs text-slate-600">
            <span className="tabular-nums">{formatPhoneBR(contact.client_phone)}</span>
            {contact.last_visit_date && (
              <>
                {" "}
                · última visita {formatDateBR(contact.last_visit_date)} ({contact.last_service_name ?? "serviço não informado"})
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {contact.client_is_demo === 1 && <Badge tone="demo">Fictícia</Badge>}
          <StageBadge stage={contact.stage} />
          {!sent && !completed && (
            <ActionForm action={removeContactAction} showSuccess={false} confirm={{ title: `Remover ${contact.client_name} da campanha?`, confirmLabel: "Remover" }}>
              <input type="hidden" name="contactId" value={contact.id} />
              <SubmitButton variant="ghost" size="sm" pendingLabel="…">
                Remover
              </SubmitButton>
            </ActionForm>
          )}
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        {!contactable && !sent && contact.stage !== "opted_out" && (
          <Alert tone="warning">A autorização desta cliente não está ativa. Não é possível aprovar nem enviar mensagem.</Alert>
        )}

        {/* 1. Mensagem ainda não gerada */}
        {!contact.message_text && !sent && contactable && !completed && (
          <ActionForm action={generateMessagesAction} className="flex flex-wrap items-center gap-3" showSuccess={false}>
            <input type="hidden" name="campaignId" value={campaign.id} />
            <input type="hidden" name="contactId" value={contact.id} />
            <p className="text-sm text-slate-600">Nenhuma mensagem preparada.</p>
            <SubmitButton variant="secondary" size="sm" pendingLabel="Gerando…">
              Gerar sugestão
            </SubmitButton>
          </ActionForm>
        )}

        {/* 2. Revisão / edição antes do envio */}
        {contact.message_text && !sent && contact.stage !== "opted_out" && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                {contact.message_origin && ORIGIN_LABELS[contact.message_origin]}
                {contact.message_model && ` (${contact.message_model})`}
              </span>
              {contact.approved_at && (
                <span className="font-medium text-emerald-800">
                  Aprovada por {contact.approved_by_name ?? "usuário"} em {formatDateTimeBR(contact.approved_at)}
                </span>
              )}
            </div>
            <ActionForm action={editMessageAction} className="space-y-2" showSuccess>
              <input type="hidden" name="contactId" value={contact.id} />
              <label htmlFor={`msg-${contact.id}`} className="sr-only">
                Mensagem para {contact.client_name}
              </label>
              <Textarea
                key={contact.message_text}
                id={`msg-${contact.id}`}
                name="message"
                rows={4}
                maxLength={1000}
                defaultValue={contact.message_text}
                disabled={completed}
              />
              {warnings.length > 0 && (
                <Alert tone="warning" title="Confira antes de aprovar">
                  <ul className="list-disc pl-5">
                    {warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </Alert>
              )}
              {!completed && (
                <div className="flex flex-wrap gap-2">
                  {!contact.approved_at && contactable && (
                    <SubmitButton size="sm" name="intent" value="approve" pendingLabel="Aprovando…">
                      Aprovar mensagem
                    </SubmitButton>
                  )}
                  <SubmitButton variant="secondary" size="sm" name="intent" value="save">
                    Salvar edição
                  </SubmitButton>
                </div>
              )}
            </ActionForm>
            {!completed && contactable && (
              <ActionForm action={generateMessagesAction} showSuccess={false}>
                <input type="hidden" name="campaignId" value={campaign.id} />
                <input type="hidden" name="contactId" value={contact.id} />
                <SubmitButton variant="ghost" size="sm" pendingLabel="Gerando…">
                  Gerar outra sugestão
                </SubmitButton>
              </ActionForm>
            )}
          </div>
        )}

        {/* 3. Envio manual (somente após aprovação) */}
        {contact.approved_at && !sent && contactable && !completed && (
          <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-4">
            <p className="text-sm font-medium text-slate-900">Enviar pelo seu WhatsApp</p>
            <p className="mt-1 text-xs text-slate-600">
              O sistema não envia mensagens. Copie o texto ou abra a conversa, envie você mesma e depois registre o envio.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <CopyButton text={contact.message_text ?? ""} />
              {contact.client_is_demo === 1 ? (
                <span className="text-xs text-violet-800">Contato fictício: abrir conversa desativado.</span>
              ) : (
                <a
                  href={whatsappClickToChatUrl(contact.client_phone, contact.message_text ?? "")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  Abrir conversa no WhatsApp
                </a>
              )}
            </div>
            <ActionForm action={markSentAction} className="mt-3 flex flex-wrap items-end gap-2" showSuccess={false}>
              <input type="hidden" name="contactId" value={contact.id} />
              <div>
                <label htmlFor={`ch-${contact.id}`} className="mb-1 block text-xs font-medium text-slate-600">
                  Enviada por
                </label>
                <Select id={`ch-${contact.id}`} name="channel" defaultValue="manual_whatsapp" className="h-8">
                  {(Object.keys(CHANNEL_LABELS) as SentChannel[]).map((k) => (
                    <option key={k} value={k}>
                      {CHANNEL_LABELS[k]}
                    </option>
                  ))}
                </Select>
              </div>
              <SubmitButton size="sm" pendingLabel="Registrando…">
                Registrar envio
              </SubmitButton>
            </ActionForm>
          </div>
        )}

        {/* 4. Após o envio: mensagem enviada e resultados */}
        {sent && (
          <div className="space-y-3">
            <blockquote className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-800">{contact.message_text}</blockquote>
            <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <div>
                <dt className="inline text-slate-500">Enviada: </dt>
                <dd className="inline">
                  {formatDateTimeBR(contact.sent_at)} · {contact.sent_channel ? CHANNEL_LABELS[contact.sent_channel] : "—"}{" "}
                  <span className="text-xs text-slate-500">({contact.sent_data_source === "integration" ? "integração" : "registro manual"})</span>
                </dd>
              </div>
              {contact.replied_at && (
                <div>
                  <dt className="inline text-slate-500">Resposta: </dt>
                  <dd className="inline">{formatDateBR(contact.replied_at)}</dd>
                </div>
              )}
              {contact.scheduled_at && (
                <div>
                  <dt className="inline text-slate-500">Agendamento: </dt>
                  <dd className="inline">
                    registrado em {formatDateBR(contact.scheduled_at)}
                    {contact.scheduled_for && `, para ${formatDateBR(contact.scheduled_for)}`}
                  </dd>
                </div>
              )}
              {contact.returned_at && (
                <div>
                  <dt className="inline text-slate-500">Retorno: </dt>
                  <dd className="inline">
                    {formatDateBR(contact.returned_at)}
                    {contact.revenue_cents != null && (
                      <>
                        {" "}
                        · {formatBRL(contact.revenue_cents)}{" "}
                        <span className="text-xs text-slate-500">
                          ({contact.revenue_source === "integration" ? "via integração" : "valor informado manualmente"})
                        </span>
                      </>
                    )}{" "}
                    {attribution === "attributed" ? (
                      <Badge tone="success">Atribuído à campanha</Badge>
                    ) : (
                      <Badge tone="warning" title={`Fora da janela de ${campaign.attribution_window_days} dias após o envio`}>
                        Fora da janela de atribuição
                      </Badge>
                    )}
                  </dd>
                </div>
              )}
            </dl>
            {contact.stage !== "returned" && contact.stage !== "opted_out" && (
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="mb-3 text-sm font-medium text-slate-900">Registrar resultado do contato</p>
                <OutcomeForm
                  action={registerOutcomeAction}
                  contactId={contact.id}
                  today={today}
                  minDate={timestampToLocalDate(contact.sent_at!)}
                  services={services.map((s) => ({ id: s.id, name: s.name }))}
                  defaultServiceId={defaultServiceId}
                />
              </div>
            )}
          </div>
        )}

        {events.length > 0 && (
          <details className="text-xs text-slate-600">
            <summary className="cursor-pointer select-none text-slate-500 hover:text-slate-800">Histórico ({events.length})</summary>
            <ol className="mt-2 space-y-1 border-l border-slate-200 pl-3">
              {events.map((e) => (
                <li key={e.id}>
                  {formatDateTimeBR(e.created_at)} — {EVENT_LABELS[e.type] ?? e.type}
                  {e.user_name && ` · ${e.user_name}`} <span className="text-slate-400">({SOURCE_LABELS[e.data_source]})</span>
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </li>
  );
}
