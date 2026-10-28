import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Badge, Button, Card, EmptyState, Input, LinkButton, PageHeader, Select, Table, Td, Th } from "@/components/ui";
import { requireContext } from "@/lib/auth/session";
import { listClients, PAGE_SIZE } from "@/lib/repos/clients";
import { formatDateBR } from "@/lib/domain/dates";
import { formatPhoneBR } from "@/lib/domain/phone";
import { ConsentBadge } from "@/components/badges";

export const metadata: Metadata = { title: "Clientes" };

type Search = { q?: string; consent?: string; pagina?: string; excluido?: string };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.pagina) || 1);
  const consent = ["granted", "not_informed", "denied", "opted_out"].includes(sp.consent ?? "")
    ? (sp.consent as "granted")
    : "";
  const { rows, total } = listClients(ctx, { q: sp.q?.slice(0, 80), consent, page });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (consent) params.set("consent", consent);
    params.set("pagina", String(p));
    return `/clientes?${params}`;
  };

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Contatos, histórico de visitas e autorização para mensagens."
        actions={
          <>
            <LinkButton href="/clientes/importar" variant="secondary">
              Importar planilha
            </LinkButton>
            <LinkButton href="/clientes/novo">Nova cliente</LinkButton>
          </>
        }
      />
      {sp.excluido && (
        <div className="mb-4">
          <Alert tone="success">Cliente excluída, com todo o seu histórico.</Alert>
        </div>
      )}
      <Card>
        <form className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-5 py-4" role="search">
          <div className="min-w-48 flex-1">
            <label htmlFor="q" className="mb-1 block text-xs font-medium text-slate-600">
              Buscar por nome ou telefone
            </label>
            <Input id="q" name="q" defaultValue={sp.q ?? ""} placeholder="Ex.: Ana ou 98765" />
          </div>
          <div>
            <label htmlFor="consent" className="mb-1 block text-xs font-medium text-slate-600">
              Autorização
            </label>
            <Select id="consent" name="consent" defaultValue={consent}>
              <option value="">Todas</option>
              <option value="granted">Autorizou mensagens</option>
              <option value="not_informed">Não registrada</option>
              <option value="denied">Não autorizou</option>
              <option value="opted_out">Pediu para não receber</option>
            </Select>
          </div>
          <Button type="submit" variant="secondary">
            Filtrar
          </Button>
        </form>
        {rows.length === 0 ? (
          <EmptyState
            title={sp.q || consent ? "Nenhuma cliente encontrada" : "Nenhuma cliente cadastrada"}
            description={sp.q || consent ? "Ajuste a busca ou os filtros." : "Cadastre clientes manualmente ou importe uma planilha CSV."}
            action={!sp.q && !consent ? <LinkButton href="/clientes/importar">Importar planilha</LinkButton> : undefined}
          />
        ) : (
          <>
            <Table>
              <thead className="bg-slate-50">
                <tr>
                  <Th>Nome</Th>
                  <Th>Telefone</Th>
                  <Th>Última visita</Th>
                  <Th>Próxima visita</Th>
                  <Th>Mensagens</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <Td>
                      <Link href={`/clientes/${c.id}`} className="font-medium text-slate-900 hover:underline">
                        {c.name}
                      </Link>
                      {c.is_demo === 1 && (
                        <span className="ml-2">
                          <Badge tone="demo">Fictícia</Badge>
                        </span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap tabular-nums">{formatPhoneBR(c.phone)}</Td>
                    <Td className="whitespace-nowrap">
                      {c.last_visit_date ? (
                        <>
                          {formatDateBR(c.last_visit_date)}
                          <span className="block text-xs text-slate-500">{c.last_service_name ?? "Serviço não informado"}</span>
                        </>
                      ) : (
                        <span className="text-slate-500">Sem visita registrada</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap">{formatDateBR(c.next_visit_date)}</Td>
                    <Td>
                      <ConsentBadge consent={c.consent_status} optedOut={!!c.opted_out_at} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
              <span>
                {total} {total === 1 ? "cliente" : "clientes"}
              </span>
              {pages > 1 && (
                <div className="flex items-center gap-2">
                  {page > 1 && (
                    <LinkButton href={qs(page - 1)} variant="secondary" size="sm">
                      Anterior
                    </LinkButton>
                  )}
                  <span>
                    Página {page} de {pages}
                  </span>
                  {page < pages && (
                    <LinkButton href={qs(page + 1)} variant="secondary" size="sm">
                      Próxima
                    </LinkButton>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </>
  );
}
