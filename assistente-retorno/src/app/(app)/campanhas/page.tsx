import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Badge, Card, EmptyState, LinkButton, PageHeader, Table, Td, Th } from "@/components/ui";
import { requireContext } from "@/lib/auth/session";
import { listCampaigns } from "@/lib/repos/campaigns";
import { CAMPAIGN_STATUS_LABELS, GOAL_LABELS } from "@/lib/domain/labels";
import { formatDateBR } from "@/lib/domain/dates";

export const metadata: Metadata = { title: "Campanhas" };

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ excluida?: string }> }) {
  const ctx = await requireContext();
  const { excluida } = await searchParams;
  const campaigns = listCampaigns(ctx);
  return (
    <>
      <PageHeader
        title="Campanhas"
        description="Cada campanha reúne clientes, mensagens revisadas e o registro dos resultados."
        actions={<LinkButton href="/campanhas/nova">Nova campanha</LinkButton>}
      />
      {excluida && (
        <div className="mb-4">
          <Alert tone="success">Campanha excluída.</Alert>
        </div>
      )}
      <Card>
        {campaigns.length === 0 ? (
          <EmptyState
            title="Nenhuma campanha"
            description="Comece pela lista de reativação para escolher as clientes."
            action={<LinkButton href="/reativacao">Ver clientes para reativação</LinkButton>}
          />
        ) : (
          <Table>
            <thead className="bg-slate-50">
              <tr>
                <Th>Campanha</Th>
                <Th>Status</Th>
                <Th className="text-right">Clientes</Th>
                <Th className="text-right">Preparadas</Th>
                <Th className="text-right">Aprovadas</Th>
                <Th className="text-right">Enviadas</Th>
                <Th className="text-right">Respostas</Th>
                <Th className="text-right">Retornos</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <Td>
                    <Link href={`/campanhas/${c.id}`} className="font-medium text-slate-900 hover:underline">
                      {c.name}
                    </Link>
                    <span className="block text-xs text-slate-500">
                      {GOAL_LABELS[c.goal]} · criada em {formatDateBR(c.created_at)}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={c.status === "active" ? "brand" : c.status === "draft" ? "warning" : "neutral"}>
                        {CAMPAIGN_STATUS_LABELS[c.status]}
                      </Badge>
                      {c.is_demo === 1 && <Badge tone="demo">Fictícia</Badge>}
                    </div>
                  </Td>
                  {[c.funnel.selected, c.funnel.prepared, c.funnel.approved, c.funnel.sent, c.funnel.replied, c.funnel.returnedAttributed].map(
                    (n, i) => (
                      <Td key={i} className="text-right tabular-nums">
                        {n}
                      </Td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
