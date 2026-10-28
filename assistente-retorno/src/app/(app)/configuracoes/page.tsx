import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Alert, Badge, Card, CardBody, CardHeader, Field, Input, PageHeader, Table, Td, Th } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";
import { getAiStatus } from "@/lib/ai";
import { CHANNELS } from "@/lib/channels";
import { formatDateTimeBR } from "@/lib/domain/dates";
import { formatBRL } from "@/lib/domain/money";
import { getPlan, PLANS } from "@/lib/plans";
import { AUDIT_LABELS, listAudit } from "@/lib/repos/audit";
import { countClients } from "@/lib/repos/clients";
import { listCampaigns } from "@/lib/repos/campaigns";
import { retentionCandidates } from "@/lib/repos/privacy";
import { listServices } from "@/lib/repos/services";
import { aiMessagesThisMonth, getTenant } from "@/lib/repos/tenants";
import { get } from "@/lib/db";
import {
  changePlanAction,
  deleteAccountAction,
  loadDemoAction,
  purgeRetentionAction,
  removeDemoAction,
  updateSettingsAction,
  upsertServiceAction,
} from "./actions";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const session = await requireSession();
  const isOwner = session.role === "owner";
  const tenant = getTenant(session);
  const services = listServices(session);
  const plan = getPlan(tenant.plan);
  const clients = countClients(session);
  const activeCampaigns = listCampaigns(session).filter((c) => c.status === "active").length;
  const aiUsed = aiMessagesThisMonth(session);
  const ai = getAiStatus();
  const audit = listAudit(session, 50);
  const retention = retentionCandidates(session);
  const demoCount =
    get<{ n: number }>("SELECT COUNT(*) AS n FROM clients WHERE tenant_id = ? AND is_demo = 1", session.tenantId)?.n ?? 0;

  return (
    <>
      <PageHeader title="Configurações" description="Dados do salão, prazos de retorno, plano, integrações e privacidade." />
      {!isOwner && (
        <div className="mb-6">
          <Alert tone="info">Você tem acesso de equipe. Apenas a pessoa responsável pela conta pode alterar estas configurações.</Alert>
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader title="Dados do salão" />
          <CardBody>
            <ActionForm action={updateSettingsAction} className="grid gap-4 sm:grid-cols-3">
              <Field label="Nome do salão" htmlFor="s-name" required>
                <Input id="s-name" name="name" defaultValue={tenant.name} required maxLength={80} disabled={!isOwner} />
              </Field>
              <Field label="Prazo padrão de retorno (dias)" htmlFor="s-days" required hint="Usado para serviços sem prazo próprio.">
                <Input id="s-days" name="defaultIntervalDays" type="number" min={7} max={730} defaultValue={tenant.default_interval_days} disabled={!isOwner} />
              </Field>
              <Field label="Retenção de dados (meses)" htmlFor="s-ret" required hint="Clientes sem visita há mais tempo podem ser excluídas.">
                <Input id="s-ret" name="dataRetentionMonths" type="number" min={6} max={120} defaultValue={tenant.data_retention_months} disabled={!isOwner} />
              </Field>
              {isOwner && (
                <div className="sm:col-span-3">
                  <SubmitButton>Salvar</SubmitButton>
                </div>
              )}
            </ActionForm>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={<span id="servicos">Serviços e prazos de retorno</span>}
            description="Cada serviço tem sua própria frequência de retorno. Deixe em branco para usar o prazo padrão do salão."
          />
          <ul className="divide-y divide-slate-100">
            {services.map((s) => (
              <li key={s.id} className="px-5 py-3">
                <ActionForm action={upsertServiceAction} className="flex flex-wrap items-end gap-3" showSuccess={false}>
                  <input type="hidden" name="id" value={s.id} />
                  <div className="min-w-48 flex-1">
                    <label htmlFor={`sv-${s.id}`} className="sr-only">
                      Nome do serviço
                    </label>
                    <Input id={`sv-${s.id}`} name="name" defaultValue={s.name} required maxLength={80} disabled={!isOwner} />
                  </div>
                  <div className="w-40">
                    <label htmlFor={`sd-${s.id}`} className="mb-1 block text-xs text-slate-600">
                      Retorno a cada (dias)
                    </label>
                    <Input
                      id={`sd-${s.id}`}
                      name="returnIntervalDays"
                      type="number"
                      min={1}
                      max={730}
                      defaultValue={s.return_interval_days ?? ""}
                      placeholder={`Padrão (${tenant.default_interval_days})`}
                      disabled={!isOwner}
                    />
                  </div>
                  {isOwner && (
                    <SubmitButton variant="secondary" size="sm">
                      Salvar
                    </SubmitButton>
                  )}
                </ActionForm>
              </li>
            ))}
          </ul>
          {isOwner && (
            <CardBody className="border-t border-slate-100">
              <ActionForm action={upsertServiceAction} resetOnSuccess className="flex flex-wrap items-end gap-3">
                <Field label="Novo serviço" htmlFor="sv-new" className="min-w-48 flex-1">
                  <Input id="sv-new" name="name" required maxLength={80} placeholder="Ex.: Botox capilar" />
                </Field>
                <Field label="Retorno a cada (dias)" htmlFor="sd-new" className="w-40">
                  <Input id="sd-new" name="returnIntervalDays" type="number" min={1} max={730} />
                </Field>
                <SubmitButton variant="secondary">Adicionar</SubmitButton>
              </ActionForm>
            </CardBody>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Plano"
            description="Preços e limites são hipóteses para validação com salões. Não há cobrança nesta versão."
            action={<Badge tone="brand">Atual: {plan.name}</Badge>}
          />
          <CardBody className="space-y-4">
            <p className="text-sm text-slate-700">
              Uso atual: {clients} de {plan.limits.maxClients} clientes · {activeCampaigns} de {plan.limits.maxActiveCampaigns} campanhas em
              andamento · {aiUsed} de {plan.limits.aiMessagesPerMonth} mensagens com IA neste mês.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {Object.values(PLANS).map((p) => (
                <div key={p.id} className={`rounded-xl border p-4 ${p.id === plan.id ? "border-brand-500 bg-brand-50/40" : "border-slate-200"}`}>
                  <p className="font-semibold text-slate-900">{p.name}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {formatBRL(p.monthlyPriceCents)}
                    <span className="text-sm font-normal text-slate-500">/mês (hipótese)</span>
                  </p>
                  <ul className="mt-2 space-y-0.5 text-sm text-slate-600">
                    <li>Até {p.limits.maxClients.toLocaleString("pt-BR")} clientes</li>
                    <li>{p.limits.maxActiveCampaigns} campanhas simultâneas</li>
                    <li>{p.limits.aiMessagesPerMonth.toLocaleString("pt-BR")} mensagens com IA/mês</li>
                    <li>{p.limits.maxUsers} usuário(s)</li>
                    <li>WhatsApp oficial: {p.features.whatsappIntegration ? "previsto (não implementado)" : "não incluso"}</li>
                  </ul>
                  {isOwner && p.id !== plan.id && (
                    <ActionForm action={changePlanAction} className="mt-3" showSuccess={false}>
                      <input type="hidden" name="plan" value={p.id} />
                      <SubmitButton variant="secondary" size="sm">
                        Simular este plano
                      </SubmitButton>
                    </ActionForm>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500">Nenhum plano promete resultados financeiros: os resultados dependem de cada salão.</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Integrações" />
          <Table>
            <thead className="bg-slate-50">
              <tr>
                <Th>Serviço</Th>
                <Th>Situação</Th>
                <Th>Observação</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <Td>IA para sugestão de mensagens</Td>
                <Td>{ai.mode === "anthropic" ? <Badge tone="success">Ativa</Badge> : <Badge tone="demo">Modo demonstrativo</Badge>}</Td>
                <Td className="text-sm text-slate-600">
                  {ai.mode === "anthropic"
                    ? `Modelo ${ai.model}. A chave fica apenas no servidor.`
                    : "Sem ANTHROPIC_API_KEY no servidor: as mensagens vêm de modelos de texto fixos, sem IA."}
                </Td>
              </tr>
              {CHANNELS.map((c) => (
                <tr key={c.id}>
                  <Td>{c.label}</Td>
                  <Td>{c.available ? <Badge tone="success">Registro manual</Badge> : <Badge>Não implementado</Badge>}</Td>
                  <Td className="text-sm text-slate-600">{c.note}</Td>
                </tr>
              ))}
              <tr>
                <Td>Cobrança da assinatura</Td>
                <Td>
                  <Badge>Não implementado</Badge>
                </Td>
                <Td className="text-sm text-slate-600">Planos acima são apenas configuração; nenhum pagamento é processado.</Td>
              </tr>
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader
            title={<span id="dados">Dados e privacidade (LGPD)</span>}
            description="Exportação, retenção e exclusão de dados. As ações ficam no registro de ações."
          />
          <CardBody className="space-y-6">
            {isOwner ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Exportar todos os dados</p>
                    <p className="text-sm text-slate-600">Arquivo JSON com clientes, visitas, campanhas e registros.</p>
                  </div>
                  <a href="/api/exportar" className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium hover:bg-slate-50">
                    Baixar exportação
                  </a>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Prazo de retenção ({tenant.data_retention_months} meses)</p>
                    <p className="text-sm text-slate-600">
                      {retention.length} cliente(s) sem visita nem cadastro recente dentro do prazo.
                    </p>
                  </div>
                  <ActionForm
                    action={purgeRetentionAction}
                    id="purge"
                    confirm={{
                      title: `Excluir ${retention.length} cliente(s) fora do prazo de retenção?`,
                      description: "A exclusão é permanente e remove também visitas e registros em campanhas.",
                      confirmLabel: "Excluir",
                      danger: true,
                    }}
                  >
                    <SubmitButton variant="secondary" disabled={retention.length === 0}>
                      Excluir fora do prazo
                    </SubmitButton>
                  </ActionForm>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Dados demonstrativos</p>
                    <p className="text-sm text-slate-600">
                      {demoCount > 0 ? `${demoCount} cliente(s) fictícia(s) nesta conta.` : "Carregue clientes e uma campanha fictícios para apresentar o produto."}
                    </p>
                  </div>
                  {demoCount > 0 ? (
                    <ActionForm
                      action={removeDemoAction}
                      id="remove-demo"
                      confirm={{ title: "Remover todos os dados fictícios?", description: "Clientes e campanhas reais não são afetados.", confirmLabel: "Remover" }}
                    >
                      <SubmitButton variant="secondary">Remover dados fictícios</SubmitButton>
                    </ActionForm>
                  ) : (
                    <ActionForm action={loadDemoAction}>
                      <SubmitButton variant="secondary" disabled={clients > 0} pendingLabel="Carregando…">
                        Carregar dados demonstrativos
                      </SubmitButton>
                    </ActionForm>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6">
                  <div>
                    <p className="text-sm font-medium text-red-800">Excluir conta do salão</p>
                    <p className="text-sm text-slate-600">Apaga definitivamente todos os dados desta empresa.</p>
                  </div>
                  <ActionForm
                    action={deleteAccountAction}
                    id="delete-account"
                    confirm={{
                      title: "Excluir a conta e todos os dados?",
                      description: "Esta ação não pode ser desfeita. Exporte os dados antes, se precisar deles.",
                      confirmLabel: "Excluir conta",
                      danger: true,
                      typeToConfirm: tenant.name,
                    }}
                  >
                    <input type="hidden" name="confirmName" value={tenant.name} />
                    <SubmitButton variant="danger">Excluir conta</SubmitButton>
                  </ActionForm>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-600">Exportação e exclusão de dados estão disponíveis para a pessoa responsável pela conta.</p>
            )}
            <p className="border-t border-slate-100 pt-4 text-xs text-slate-500">
              Para pedidos de uma cliente específica (acesso, correção, exclusão, oposição), use as opções na página da cliente.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={<span id="auditoria">Registro de ações</span>} description="Últimas 50 ações administrativas relevantes." />
          {audit.length === 0 ? (
            <CardBody>
              <p className="text-sm text-slate-600">Nenhuma ação registrada.</p>
            </CardBody>
          ) : (
            <Table>
              <thead className="bg-slate-50">
                <tr>
                  <Th>Quando</Th>
                  <Th>Quem</Th>
                  <Th>Ação</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {audit.map((a) => (
                  <tr key={a.id}>
                    <Td className="whitespace-nowrap">{formatDateTimeBR(a.created_at)}</Td>
                    <Td>{a.user_name ?? "—"}</Td>
                    <Td>{AUDIT_LABELS[a.action] ?? a.action}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
