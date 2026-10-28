import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ConsentBadge, StageBadge } from "@/components/badges";
import { ClientForm } from "@/components/client-form";
import { Alert, Badge, Card, CardBody, CardHeader, EmptyState, Field, Input, Select, Textarea } from "@/components/ui";
import { requireContext } from "@/lib/auth/session";
import { clientCampaignHistory, getClient, listVisits } from "@/lib/repos/clients";
import { listServices } from "@/lib/repos/services";
import { formatDateBR, formatDateTimeBR, todayISO } from "@/lib/domain/dates";
import { formatBRL } from "@/lib/domain/money";
import { formatPhoneBR } from "@/lib/domain/phone";
import type { ContactStage } from "@/lib/domain/labels";
import {
  addVisitAction,
  clearOptOutAction,
  deleteClientAction,
  deleteVisitAction,
  optOutAction,
  updateClientAction,
} from "../actions";

export const metadata: Metadata = { title: "Cliente" };

const ORIGIN_LABELS = { manual: "Registro manual", import: "Importação", campaign: "Retorno de campanha" } as const;

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ criado?: string }>;
}) {
  const ctx = await requireContext();
  const { id } = await params;
  const { criado } = await searchParams;
  const client = getClient(ctx, id);
  if (!client) notFound();
  const services = listServices(ctx);
  const visits = listVisits(ctx, id);
  const history = clientCampaignHistory(ctx, id);

  return (
    <>
      <header className="mb-6">
        <Link href="/clientes" className="mb-2 inline-block text-sm text-slate-600 hover:text-slate-900">
          ← Clientes
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{client.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="tabular-nums">{formatPhoneBR(client.phone)}</span>
              <ConsentBadge consent={client.consent_status} optedOut={!!client.opted_out_at} />
              {client.is_demo === 1 && <Badge tone="demo">Cliente fictícia</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`/api/clientes/${client.id}/exportar`} className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50">
              Exportar dados (LGPD)
            </a>
            <ActionForm
              action={deleteClientAction}
              id="delete-client"
              confirm={{
                title: `Excluir ${client.name}?`,
                description:
                  "Todos os dados, visitas e registros em campanhas desta cliente serão apagados de forma permanente. Use esta opção para atender pedidos de exclusão.",
                confirmLabel: "Excluir definitivamente",
                danger: true,
              }}
            >
              <input type="hidden" name="id" value={client.id} />
              <SubmitButton variant="danger" pendingLabel="Excluindo…">
                Excluir cliente
              </SubmitButton>
            </ActionForm>
          </div>
        </div>
      </header>

      {criado && (
        <div className="mb-6">
          <Alert tone="success">Cliente cadastrada.</Alert>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          <Card>
            <CardHeader title="Dados da cliente" />
            <CardBody className="py-5">
              <ClientForm action={updateClientAction} client={client} services={services} submitLabel="Salvar alterações" />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title="Histórico de visitas" description={`${visits.length} registrada(s)`} />
            <CardBody>
              <ActionForm action={addVisitAction} resetOnSuccess className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="clientId" value={client.id} />
                <Field label="Serviço" htmlFor="v-service">
                  <Select id="v-service" name="serviceId" defaultValue="">
                    <option value="">Não informado</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Data" htmlFor="v-date" required>
                  <Input id="v-date" name="visitDate" type="date" required max={todayISO()} />
                </Field>
                <Field label="Valor (R$)" htmlFor="v-amount" hint="Opcional">
                  <Input id="v-amount" name="amount" inputMode="decimal" placeholder="0,00" />
                </Field>
                <div className="flex items-end">
                  <SubmitButton variant="secondary" className="w-full">
                    Registrar visita
                  </SubmitButton>
                </div>
              </ActionForm>
            </CardBody>
            {visits.length === 0 ? (
              <EmptyState title="Nenhuma visita registrada" description="Sem visitas, a cliente não entra na lista de reativação." />
            ) : (
              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {visits.map((v) => (
                  <li key={v.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                    <div>
                      <p className="font-medium text-slate-900">
                        {formatDateBR(v.visit_date)} · {v.service_name ?? "Serviço não informado"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {ORIGIN_LABELS[v.origin]}
                        {v.campaign_name && ` (${v.campaign_name})`}
                        {v.amount_cents != null && ` · ${formatBRL(v.amount_cents)} (informado manualmente)`}
                      </p>
                    </div>
                    <ActionForm action={deleteVisitAction} showSuccess={false} confirm={{ title: "Remover esta visita?", confirmLabel: "Remover", danger: true }}>
                      <input type="hidden" name="clientId" value={client.id} />
                      <input type="hidden" name="visitId" value={v.id} />
                      <SubmitButton variant="ghost" size="sm" pendingLabel="…">
                        Remover
                      </SubmitButton>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Campanhas" />
            {history.length === 0 ? (
              <EmptyState title="Ainda não participou de campanhas" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {history.map((h) => (
                  <li key={h.campaign_id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                    <Link href={`/campanhas/${h.campaign_id}`} className="font-medium hover:underline">
                      {h.campaign_name}
                    </Link>
                    <StageBadge stage={h.stage as ContactStage} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Pedido para não receber mensagens" />
            <CardBody>
              {client.opted_out_at ? (
                <div className="space-y-3 text-sm">
                  <Alert tone="warning" title={`Registrado em ${formatDateTimeBR(client.opted_out_at)}`}>
                    {client.opt_out_note ?? "Sem observação."} A cliente não pode entrar em campanhas de mensagem.
                  </Alert>
                  <ActionForm
                    action={clearOptOutAction}
                    confirm={{
                      title: "Remover o registro de oposição?",
                      description: "Faça isso apenas se a própria cliente pediu para voltar a receber mensagens.",
                      confirmLabel: "Remover registro",
                    }}
                  >
                    <input type="hidden" name="id" value={client.id} />
                    <SubmitButton variant="secondary" size="sm">
                      A cliente pediu para voltar a receber
                    </SubmitButton>
                  </ActionForm>
                </div>
              ) : (
                <ActionForm action={optOutAction} className="space-y-3">
                  <input type="hidden" name="id" value={client.id} />
                  <Field label="Observação (opcional)" htmlFor="opt-note">
                    <Textarea id="opt-note" name="note" rows={2} maxLength={300} placeholder="Ex.: pediu pelo WhatsApp em 10/10" />
                  </Field>
                  <SubmitButton variant="secondary">Registrar pedido</SubmitButton>
                </ActionForm>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
