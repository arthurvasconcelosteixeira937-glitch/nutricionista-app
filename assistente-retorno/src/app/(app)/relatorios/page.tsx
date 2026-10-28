import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Badge, Card, CardBody, CardHeader, EmptyState, LinkButton, PageHeader, Table, Td, Th } from "@/components/ui";
import { requireContext } from "@/lib/auth/session";
import { getReport } from "@/lib/repos/reports";
import { ATTRIBUTION_RULE_TEXT } from "@/lib/domain/attribution";
import { formatBRL } from "@/lib/domain/money";
import { formatPercent, SMALL_SAMPLE_THRESHOLD, type FunnelCounts, type Rate } from "@/lib/domain/reports";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/domain/labels";

export const metadata: Metadata = { title: "Relatórios" };

function RateCard({ rate }: { rate: Rate }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-600">{rate.label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{formatPercent(rate.value)}</p>
      <p className="mt-2 text-xs text-slate-600">
        Fórmula: {rate.numeratorLabel} ÷ {rate.denominatorLabel}
        <br />= {rate.numerator} ÷ {rate.denominator}
      </p>
      {rate.smallSample && (
        <p className="mt-2 text-xs text-amber-800">
          Amostra pequena (n = {rate.denominator}, menos de {SMALL_SAMPLE_THRESHOLD}): use como indicação, não como conclusão.
        </p>
      )}
    </div>
  );
}

function Funnel({ f }: { f: FunnelCounts }) {
  const rows = [
    ["Clientes na campanha", f.selected],
    ["Mensagens preparadas", f.prepared],
    ["Mensagens aprovadas", f.approved],
    ["Mensagens enviadas", f.sent],
    ["Respostas", f.replied],
    ["Agendamentos", f.scheduled],
    ["Retornos atribuídos", f.returnedAttributed],
  ] as const;
  const max = Math.max(1, ...rows.map(([, v]) => v));
  return (
    <figure>
      <figcaption className="sr-only">Funil de contatos de todas as campanhas</figcaption>
      <ul className="space-y-2.5">
        {rows.map(([label, value]) => (
          <li key={label} className="group grid grid-cols-[9rem_1fr] items-center gap-3 sm:grid-cols-[11rem_1fr]" title={`${label}: ${value}`}>
            <span className="text-sm text-slate-700">{label}</span>
            <span className="flex items-center gap-2">
              <span
                className="h-5 rounded-r bg-brand-500 transition-opacity group-hover:opacity-80"
                style={{ width: `${(value / max) * 85}%`, minWidth: value > 0 ? 4 : 0 }}
                aria-hidden
              />
              <span className="text-sm font-semibold tabular-nums text-slate-900">{value}</span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export default async function ReportsPage() {
  const ctx = await requireContext();
  const report = getReport(ctx);
  const o = report.overall;
  const hasDemo = report.campaigns.some((c) => c.campaign.is_demo === 1);
  const revenue = o.revenueManualCents + o.revenueIntegrationCents;

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Resultados registrados nas campanhas. Toda taxa mostra a fórmula e os números usados no cálculo."
      />

      {hasDemo && (
        <div className="mb-6">
          <Alert tone="demo">
            Os números incluem campanhas fictícias de demonstração (marcadas como “Fictícia”). Eles não representam resultados reais.
          </Alert>
        </div>
      )}

      {report.campaigns.length === 0 ? (
        <Card>
          <EmptyState
            title="Sem dados suficientes"
            description="Os relatórios aparecem depois que você criar uma campanha e registrar envios e resultados."
            action={<LinkButton href="/campanhas/nova">Criar campanha</LinkButton>}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {report.overallRates.map((r) => (
              <RateCard key={r.label} rate={r} />
            ))}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-600">Receita registrada (atribuída)</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
                {o.returnsWithRevenue > 0 ? formatBRL(revenue) : "Sem dados suficientes"}
              </p>
              <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
                <li>Informada manualmente: {formatBRL(o.revenueManualCents)}</li>
                <li>Via integração: {o.revenueIntegrationCents > 0 ? formatBRL(o.revenueIntegrationCents) : "nenhuma integração ativa"}</li>
                <li>
                  Retornos com valor informado: {o.returnsWithRevenue} de {o.returnedAttributed}
                </li>
                {o.returnsWithRevenue > 0 && (
                  <li>Valor médio registrado: {formatBRL(Math.round(revenue / o.returnsWithRevenue))} (receita ÷ retornos com valor)</li>
                )}
              </ul>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader title="Funil de todas as campanhas" description="Quantidade de contatos em cada etapa." />
              <CardBody>
                <Funnel f={o} />
                {o.returnedOutsideWindow > 0 && (
                  <p className="mt-4 text-xs text-slate-600">
                    + {o.returnedOutsideWindow} retorno(s) registrados fora da janela de atribuição (não contam acima).
                  </p>
                )}
              </CardBody>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader title="Regra de atribuição" />
              <CardBody className="space-y-3 text-sm text-slate-700" >
                <p id="regra">{ATTRIBUTION_RULE_TEXT}</p>
                <ul className="list-disc space-y-1 pl-5 text-slate-600">
                  <li>Agendamentos e respostas só podem ser registrados depois do envio.</li>
                  <li>Valores de venda vêm do registro manual no retorno; dados de integração aparecerão separados.</li>
                  <li>Taxas usam como denominador as mensagens efetivamente enviadas, não as preparadas.</li>
                  <li>Correlação não é causalidade: a cliente poderia ter voltado mesmo sem a mensagem.</li>
                </ul>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Desempenho por campanha" description="Taxas calculadas sobre as mensagens enviadas de cada campanha." />
            <Table>
              <thead className="bg-slate-50">
                <tr>
                  <Th>Campanha</Th>
                  <Th className="text-right">Enviadas</Th>
                  <Th className="text-right">Respostas</Th>
                  <Th className="text-right">Agendamentos</Th>
                  <Th className="text-right">Retornos atribuídos</Th>
                  <Th className="text-right">Receita registrada</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.campaigns.map(({ campaign, funnel, rates }) => (
                  <tr key={campaign.id}>
                    <Td>
                      <Link href={`/campanhas/${campaign.id}`} className="font-medium text-slate-900 hover:underline">
                        {campaign.name}
                      </Link>
                      <span className="mt-1 flex flex-wrap gap-1">
                        <Badge>{CAMPAIGN_STATUS_LABELS[campaign.status]}</Badge>
                        {campaign.is_demo === 1 && <Badge tone="demo">Fictícia</Badge>}
                      </span>
                    </Td>
                    <Td className="text-right tabular-nums">
                      {funnel.sent}
                      <span className="block text-xs text-slate-500">de {funnel.selected} clientes</span>
                    </Td>
                    {[
                      [funnel.replied, rates[0]],
                      [funnel.scheduled, rates[1]],
                      [funnel.returnedAttributed, rates[2]],
                    ].map(([n, r], i) => (
                      <Td key={i} className="text-right tabular-nums">
                        {n as number}
                        <span className="block text-xs text-slate-500">
                          {(r as Rate).value == null ? "Sem dados suficientes" : `${formatPercent((r as Rate).value)} (${n as number} ÷ ${(r as Rate).denominator})`}
                        </span>
                      </Td>
                    ))}
                    <Td className="text-right tabular-nums">
                      {funnel.returnsWithRevenue > 0 ? formatBRL(funnel.revenueManualCents + funnel.revenueIntegrationCents) : "Sem dados"}
                      {funnel.returnsWithRevenue > 0 && (
                        <span className="block text-xs text-slate-500">manual, {funnel.returnsWithRevenue} retorno(s) com valor</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      )}
    </>
  );
}
