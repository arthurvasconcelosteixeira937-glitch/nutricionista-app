import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { CampaignFields } from "@/components/campaign-fields";
import { Alert, Card, CardBody, CardHeader, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";
import { getAiStatus } from "@/lib/ai";
import { eligibleForNewCampaign, listReactivationCandidates } from "@/lib/repos/reactivation";
import { listServices } from "@/lib/repos/services";
import { createCampaignAction } from "../actions";
import { ClientPicker, type PickerClient } from "./client-picker";

export const metadata: Metadata = { title: "Nova campanha" };

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ c?: string | string[] }> }) {
  const session = await requireSession();
  const sp = await searchParams;
  const preselected = Array.isArray(sp.c) ? sp.c : sp.c ? [sp.c] : [];
  const candidates = listReactivationCandidates(session);
  const clients: PickerClient[] = candidates.map((c) => {
    const e = eligibleForNewCampaign(c);
    return {
      id: c.client.id,
      name: c.client.name,
      service: c.client.last_service_name,
      daysOverdue: c.evaluation.daysOverdue ?? 0,
      daysSince: c.evaluation.daysSince ?? 0,
      eligible: e.eligible,
      reason: e.reason,
      isDemo: c.client.is_demo === 1,
    };
  });
  const ai = getAiStatus();

  return (
    <>
      <PageHeader
        title="Nova campanha"
        description="Defina o objetivo e escolha as clientes. As mensagens são geradas depois, para você revisar uma a uma."
        back={{ href: "/campanhas", label: "Campanhas" }}
      />
      <ActionForm action={createCampaignAction} className="space-y-6">
        <Card>
          <CardHeader title="1. Configuração" description={ai.mode === "demo" ? ai.label : `Mensagens serão sugeridas por ${ai.label}.`} />
          <CardBody>
            <CampaignFields services={listServices(session)} salonName={session.tenantName} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="2. Clientes elegíveis"
            description="Clientes que passaram do prazo de retorno. Só é possível selecionar quem tem autorização para mensagens e não está em outra campanha aberta."
          />
          {clients.length === 0 ? (
            <EmptyState
              title="Nenhuma cliente precisa de acompanhamento agora"
              action={<LinkButton href="/clientes" variant="secondary">Ver clientes</LinkButton>}
            />
          ) : (
            <ClientPicker clients={clients} preselected={preselected} />
          )}
        </Card>
        <Alert tone="info">
          Criar a campanha não envia nada. Na próxima tela você gera as mensagens, revisa, aprova e registra o envio feito por você.
        </Alert>
        <div className="flex justify-end">
          <SubmitButton pendingLabel="Criando…">Criar campanha</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
