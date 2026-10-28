import type { Metadata } from "next";
import Link from "next/link";
import { ContactabilityBadge } from "@/components/badges";
import { SelectAllCheckbox } from "@/components/select-all";
import { Alert, Badge, Button, Card, CardHeader, EmptyState, Input, LinkButton, PageHeader, Select, Table, Td, Th } from "@/components/ui";
import { requireContext } from "@/lib/auth/session";
import { isValidISODate } from "@/lib/domain/dates";
import { formatPhoneBR } from "@/lib/domain/phone";
import {
  CONTACT_STATUS_LABELS,
  eligibleForNewCampaign,
  listReactivationCandidates,
  type ContactStatus,
} from "@/lib/repos/reactivation";
import { listServices } from "@/lib/repos/services";
import { getTenant } from "@/lib/repos/tenants";

export const metadata: Metadata = { title: "Reativação" };

type Search = { dias?: string; servico?: string; de?: string; ate?: string; status?: string; autorizacao?: string };

export default async function ReactivationPage({ searchParams }: { searchParams: Promise<Search> }) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const services = listServices(ctx);
  const tenant = getTenant(ctx);
  const minDays = [30, 60, 90, 120, 180, 365].includes(Number(sp.dias)) ? Number(sp.dias) : null;
  const serviceId = services.some((s) => s.id === sp.servico) ? sp.servico! : null;
  const contactStatus = (Object.keys(CONTACT_STATUS_LABELS) as ContactStatus[]).includes(sp.status as ContactStatus)
    ? (sp.status as ContactStatus)
    : null;
  const consent = sp.autorizacao === "ok" || sp.autorizacao === "not_ok" ? sp.autorizacao : null;
  const from = sp.de && isValidISODate(sp.de) ? sp.de : null;
  const to = sp.ate && isValidISODate(sp.ate) ? sp.ate : null;

  const candidates = listReactivationCandidates(ctx, {
    minDays,
    serviceId,
    lastVisitFrom: from,
    lastVisitTo: to,
    contactStatus,
    consent,
  });
  const eligibleCount = candidates.filter((c) => eligibleForNewCampaign(c).eligible).length;
  const hasFilters = !!(minDays || serviceId || contactStatus || consent || from || to);

  return (
    <>
      <PageHeader
        title="Clientes para reativação"
        description="Clientes cuja última visita passou do prazo de retorno do serviço e que não têm próxima visita marcada."
        actions={
          <LinkButton href="/configuracoes#servicos" variant="secondary">
            Ajustar prazos por serviço
          </LinkButton>
        }
      />

      <Card className="mb-6">
        <form className="grid gap-4 px-5 py-4 sm:grid-cols-2 lg:grid-cols-6" aria-label="Filtros">
          <div className="lg:col-span-2">
            <label htmlFor="dias" className="mb-1 block text-xs font-medium text-slate-600">
              Tempo desde a última visita
            </label>
            <Select id="dias" name="dias" defaultValue={minDays ?? ""}>
              <option value="">Prazo de retorno de cada serviço</option>
              {[30, 60, 90, 120, 180, 365].map((d) => (
                <option key={d} value={d}>
                  Pelo menos {d} dias
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="servico" className="mb-1 block text-xs font-medium text-slate-600">
              Serviço da última visita
            </label>
            <Select id="servico" name="servico" defaultValue={serviceId ?? ""}>
              <option value="">Todos</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="status" className="mb-1 block text-xs font-medium text-slate-600">
              Status de contato
            </label>
            <Select id="status" name="status" defaultValue={contactStatus ?? ""}>
              <option value="">Todos</option>
              {(Object.keys(CONTACT_STATUS_LABELS) as ContactStatus[]).map((k) => (
                <option key={k} value={k}>
                  {CONTACT_STATUS_LABELS[k]}
                </option>
              ))}
            </Select>
          </div>
          <div className="lg:col-span-2">
            <label htmlFor="autorizacao" className="mb-1 block text-xs font-medium text-slate-600">
              Autorização para comunicação
            </label>
            <Select id="autorizacao" name="autorizacao" defaultValue={consent ?? ""}>
              <option value="">Todas</option>
              <option value="ok">Com autorização ativa</option>
              <option value="not_ok">Sem autorização / pediu para não receber</option>
            </Select>
          </div>
          <div>
            <label htmlFor="de" className="mb-1 block text-xs font-medium text-slate-600">
              Última visita a partir de
            </label>
            <Input id="de" name="de" type="date" defaultValue={from ?? ""} />
          </div>
          <div>
            <label htmlFor="ate" className="mb-1 block text-xs font-medium text-slate-600">
              Última visita até
            </label>
            <Input id="ate" name="ate" type="date" defaultValue={to ?? ""} />
          </div>
          <div className="flex items-end gap-2 lg:col-span-4">
            <Button type="submit" variant="secondary">
              Aplicar filtros
            </Button>
            {hasFilters && (
              <LinkButton href="/reativacao" variant="ghost">
                Limpar
              </LinkButton>
            )}
          </div>
        </form>
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          Prazos de retorno: {services.filter((s) => s.return_interval_days).map((s) => `${s.name} ${s.return_interval_days}d`).join(" · ")}.
          Serviços sem prazo usam o padrão do salão ({tenant.default_interval_days} dias).
        </p>
      </Card>

      <form id="selecao" action="/campanhas/nova" method="get">
        <Card>
          <CardHeader
            title={`${candidates.length} cliente(s) precisam de acompanhamento`}
            description={`${eligibleCount} podem entrar numa nova campanha agora (com autorização e fora de outra campanha aberta).`}
            action={
              candidates.length > 0 && (
                <div className="flex flex-wrap items-center gap-3">
                  <SelectAllCheckbox formId="selecao" name="c" label="Selecionar elegíveis" />
                  <Button type="submit">Criar campanha com selecionadas</Button>
                </div>
              )
            }
          />
          {candidates.length === 0 ? (
            <EmptyState
              title={hasFilters ? "Nenhuma cliente com esses filtros" : "Nenhuma cliente precisa de acompanhamento agora"}
              description={
                hasFilters
                  ? "Ajuste ou limpe os filtros."
                  : "Todas as clientes com visitas registradas estão dentro do prazo de retorno ou já têm próxima visita marcada."
              }
            />
          ) : (
            <Table>
              <thead className="bg-slate-50">
                <tr>
                  <Th className="w-10">
                    <span className="sr-only">Selecionar</span>
                  </Th>
                  <Th>Cliente</Th>
                  <Th>Por que aparece aqui</Th>
                  <Th>Dias além do prazo</Th>
                  <Th>Contato</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidates.map((c) => {
                  const elig = eligibleForNewCampaign(c);
                  return (
                    <tr key={c.client.id} className="hover:bg-slate-50">
                      <Td>
                        <input
                          type="checkbox"
                          name="c"
                          value={c.client.id}
                          disabled={!elig.eligible}
                          title={elig.reason ?? "Incluir na campanha"}
                          aria-label={`Selecionar ${c.client.name}`}
                          className="size-4 accent-brand-700"
                        />
                      </Td>
                      <Td>
                        <Link href={`/clientes/${c.client.id}`} className="font-medium text-slate-900 hover:underline">
                          {c.client.name}
                        </Link>
                        <span className="block text-xs tabular-nums text-slate-500">{formatPhoneBR(c.client.phone)}</span>
                        {c.client.is_demo === 1 && (
                          <span className="mt-1 inline-block">
                            <Badge tone="demo">Fictícia</Badge>
                          </span>
                        )}
                      </Td>
                      <Td className="max-w-md">
                        <ul className="space-y-0.5 text-sm text-slate-700">
                          {c.evaluation.reasons.map((r) => (
                            <li key={r}>{r}</li>
                          ))}
                        </ul>
                      </Td>
                      <Td className="whitespace-nowrap tabular-nums">
                        <span className="font-semibold">{c.evaluation.daysOverdue}</span>
                        <span className="block text-xs text-slate-500">{c.evaluation.daysSince} dias sem visita</span>
                      </Td>
                      <Td className="space-y-1">
                        <ContactabilityBadge value={c.evaluation.contactability} />
                        <p className="text-xs text-slate-600">
                          {CONTACT_STATUS_LABELS[c.contactStatus]}
                          {c.latestCampaign && c.contactStatus !== "never" && (
                            <>
                              {" "}
                              (
                              <Link href={`/campanhas/${c.latestCampaign.id}`} className="underline">
                                {c.latestCampaign.name}
                              </Link>
                              )
                            </>
                          )}
                        </p>
                        {!elig.eligible && <p className="text-xs text-slate-500">{elig.reason}</p>}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
      </form>
      <div className="mt-4">
        <Alert tone="info">
          A lista é uma sugestão baseada nos prazos configurados. Revise antes de contatar: o sistema não sabe de visitas que não
          foram registradas.
        </Alert>
      </div>
    </>
  );
}
