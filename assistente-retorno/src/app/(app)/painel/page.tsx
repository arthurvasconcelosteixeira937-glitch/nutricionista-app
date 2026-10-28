import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Badge, Card, CardBody, CardHeader, EmptyState, LinkButton, PageHeader, StatCard } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";
import { getDashboard } from "@/lib/repos/reports";
import { formatBRL } from "@/lib/domain/money";
import { formatPercent } from "@/lib/domain/reports";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/domain/labels";

export const metadata: Metadata = { title: "Painel" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ bemvindo?: string }> }) {
  const session = await requireSession();
  const { bemvindo } = await searchParams;
  const d = getDashboard(session);
  const revenue = d.overall.revenueManualCents + d.overall.revenueIntegrationCents;

  return (
    <>
      <PageHeader
        title={`Olá, ${session.userName.split(" ")[0]}`}
        description="Resumo do relacionamento com as clientes do salão e dos resultados registrados nas campanhas."
        actions={
          <>
            <LinkButton href="/reativacao" variant="secondary">
              Ver quem precisa de retorno
            </LinkButton>
            <LinkButton href="/campanhas/nova">Nova campanha</LinkButton>
          </>
        }
      />

      {bemvindo && (
        <div className="mb-6">
          <Alert tone="success" title="Conta criada">
            Comece cadastrando clientes ou importando uma planilha. Para conhecer o produto com dados fictícios, use{" "}
            <Link href="/configuracoes#dados" className="font-medium underline">
              Configurações → Carregar dados demonstrativos
            </Link>
            .
          </Alert>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Clientes cadastradas" value={d.totalClients} href="/clientes" />
        <StatCard
          label="Precisam de acompanhamento"
          value={d.needFollowUp}
          hint={`${d.needFollowUpContactable} com autorização para mensagens`}
          href="/reativacao"
        />
        <StatCard
          label="Mensagens preparadas"
          value={d.messagesPrepared}
          hint={d.messagesAwaitingApproval > 0 ? `${d.messagesAwaitingApproval} aguardando sua aprovação` : "Ainda não enviadas"}
          href="/campanhas"
        />
        <StatCard
          label="Campanhas em andamento"
          value={d.activeCampaigns}
          hint={d.draftCampaigns > 0 ? `${d.draftCampaigns} em rascunho` : undefined}
          href="/campanhas"
        />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-600">Resultados atribuídos às campanhas</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Clientes que retornaram"
          value={d.overall.returnedAttributed}
          hint={`de ${d.overall.sent} mensagens enviadas`}
          href="/relatorios"
        />
        <StatCard
          label="Agendamentos atribuídos"
          value={d.overall.scheduled}
          hint="Registrados após o envio da mensagem"
          href="/relatorios"
        />
        <StatCard
          label="Receita atribuída"
          value={d.overall.returnsWithRevenue > 0 ? formatBRL(revenue) : "Sem dados suficientes"}
          hint={
            d.overall.returnsWithRevenue > 0
              ? `Informada manualmente em ${d.overall.returnsWithRevenue} de ${d.overall.returnedAttributed} retornos`
              : "Registre o valor ao marcar o retorno de uma cliente"
          }
          href="/relatorios"
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Só contam retornos registrados na campanha, após o envio e dentro da janela de atribuição.{" "}
        <Link href="/relatorios#regra" className="underline">
          Ver regra
        </Link>
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Campanhas recentes"
            action={
              <Link href="/campanhas" className="text-sm font-medium text-brand-700 hover:underline">
                Ver todas
              </Link>
            }
          />
          {d.recentCampaigns.length === 0 ? (
            <EmptyState
              title="Nenhuma campanha ainda"
              description="Crie uma campanha para preparar mensagens às clientes que estão há mais tempo sem voltar."
              action={<LinkButton href="/campanhas/nova">Criar campanha</LinkButton>}
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.recentCampaigns.map(({ campaign, funnel, rates }) => (
                <li key={campaign.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/campanhas/${campaign.id}`} className="font-medium text-slate-900 hover:underline">
                      {campaign.name}
                    </Link>
                    <div className="flex gap-2">
                      {campaign.is_demo === 1 && <Badge tone="demo">Fictícia</Badge>}
                      <Badge tone={campaign.status === "active" ? "brand" : "neutral"}>{CAMPAIGN_STATUS_LABELS[campaign.status]}</Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {funnel.selected} clientes · {funnel.sent} enviadas · {funnel.replied} respostas · {funnel.returnedAttributed} retornos
                    {funnel.sent > 0 && <> · resposta {formatPercent(rates[0].value)}</>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Como usar" description="Fluxo sugerido para recuperar clientes" />
          <CardBody>
            <ol className="space-y-3 text-sm text-slate-700">
              {[
                ["/reativacao", "Veja quem está há mais tempo sem voltar e por quê."],
                ["/campanhas/nova", "Crie uma campanha e escolha as clientes autorizadas."],
                ["/campanhas", "Gere, revise e aprove cada mensagem."],
                ["/campanhas", "Envie pelo seu WhatsApp e registre o envio."],
                ["/campanhas", "Registre respostas, agendamentos e retornos."],
                ["/relatorios", "Acompanhe os resultados com as fórmulas visíveis."],
              ].map(([href, text], i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-800">
                    {i + 1}
                  </span>
                  <Link href={href} className="hover:underline">
                    {text}
                  </Link>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
