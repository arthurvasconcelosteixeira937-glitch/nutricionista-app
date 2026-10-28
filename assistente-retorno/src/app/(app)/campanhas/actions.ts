"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireContext } from "@/lib/auth/session";
import { formToObject, safeAction } from "@/lib/actions";
import type { ActionState } from "@/lib/action-state";
import { campaignSchema, outcomeSchema } from "@/lib/validation";
import {
  approveAllDrafted,
  approveMessage,
  createCampaign,
  deleteCampaign,
  editMessage,
  generateMessages,
  markSent,
  registerOutcome,
  removeContact,
  requireContact,
  setCampaignStatus,
  updateCampaignSettings,
} from "@/lib/repos/campaigns";
import { logAudit } from "@/lib/repos/audit";
import { DomainError } from "@/lib/domain/errors";

const id = z.uuid("Identificador inválido.");

function campaignPath(campaignId: string) {
  revalidatePath(`/campanhas/${campaignId}`);
  revalidatePath("/campanhas");
  revalidatePath("/painel");
}

export async function createCampaignAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    const input = campaignSchema.parse(formToObject(fd));
    const clientIds = z.array(id).parse(fd.getAll("clientIds"));
    const campaignId = createCampaign(ctx, input, clientIds);
    logAudit(ctx, "campaign.create", "campaign", campaignId, { clientes: clientIds.length });
    revalidatePath("/campanhas");
    redirect(`/campanhas/${campaignId}?criada=1`);
  });
}

export async function updateCampaignAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    const campaignId = id.parse(fd.get("campaignId"));
    updateCampaignSettings(ctx, campaignId, campaignSchema.parse(formToObject(fd)));
    campaignPath(campaignId);
    return "Configurações salvas. Mensagens já geradas não mudam; gere novamente se quiser aplicar o novo tom/objetivo.";
  });
}

export async function setCampaignStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    const campaignId = id.parse(fd.get("campaignId"));
    const status = z.enum(["active", "completed"]).parse(fd.get("status"));
    setCampaignStatus(ctx, campaignId, status);
    logAudit(ctx, "campaign.status", "campaign", campaignId, { status });
    campaignPath(campaignId);
    return status === "active" ? "Campanha em andamento." : "Campanha concluída.";
  });
}

export async function deleteCampaignAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    const campaignId = id.parse(fd.get("campaignId"));
    deleteCampaign(ctx, campaignId);
    logAudit(ctx, "campaign.delete", "campaign", campaignId);
    revalidatePath("/campanhas");
    redirect("/campanhas?excluida=1");
  });
}

export async function generateMessagesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    const campaignId = id.parse(fd.get("campaignId"));
    const contactId = fd.get("contactId");
    const report = await generateMessages(ctx, campaignId, {
      contactIds: contactId ? [id.parse(contactId)] : undefined,
      overwrite: !!contactId,
    });
    campaignPath(campaignId);
    const how = report.mode === "demo" ? "pelo modo demonstrativo (modelos de texto, sem IA)" : "com IA";
    if (report.generated === 0 && report.failed === 0) throw new DomainError("Não há contatos aguardando mensagem.");
    if (report.failed > 0) {
      throw new DomainError(
        `${report.generated} mensagem(ns) preparada(s) ${how}; ${report.failed} falharam: ${report.errors.slice(0, 3).join(" ")}`,
      );
    }
    return `${report.generated} mensagem(ns) preparada(s) ${how}. Revise e aprove cada uma antes de enviar.`;
  });
}

export async function editMessageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    const contactId = id.parse(fd.get("contactId"));
    const text = z
      .string()
      .trim()
      .min(10, "A mensagem está muito curta.")
      .max(1000, "A mensagem passou de 1000 caracteres.")
      .parse(fd.get("message"));
    const contact = requireContact(ctx, contactId);
    // Só marca como edição manual se o texto realmente mudou.
    const warnings: string[] =
      text !== contact.message_text ? editMessage(ctx, contactId, text) : JSON.parse(contact.message_warnings ?? "[]");
    if (fd.get("intent") === "approve") {
      approveMessage(ctx, contactId);
      campaignPath(contact.campaign_id);
      return warnings.length ? "Mensagem salva e aprovada (com avisos para conferir)." : "Mensagem salva e aprovada.";
    }
    campaignPath(contact.campaign_id);
    return "Edição salva. Aprove a mensagem para liberar o envio.";
  });
}

export async function approveMessageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    const contactId = id.parse(fd.get("contactId"));
    const contact = requireContact(ctx, contactId);
    approveMessage(ctx, contactId);
    campaignPath(contact.campaign_id);
    return "Mensagem aprovada.";
  });
}

export async function approveAllAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    const campaignId = id.parse(fd.get("campaignId"));
    const n = approveAllDrafted(ctx, campaignId);
    logAudit(ctx, "campaign.approve_all", "campaign", campaignId, { aprovadas: n });
    campaignPath(campaignId);
    return n > 0 ? `${n} mensagem(ns) aprovada(s).` : "Não havia mensagens aguardando aprovação.";
  });
}

export async function markSentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    const contactId = id.parse(fd.get("contactId"));
    const channel = z
      .enum(["manual_whatsapp", "manual_phone", "manual_in_person", "manual_other"], "Escolha o meio de envio.")
      .parse(fd.get("channel"));
    const contact = requireContact(ctx, contactId);
    markSent(ctx, contactId, channel);
    campaignPath(contact.campaign_id);
    return "Envio registrado.";
  });
}

export async function registerOutcomeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    const contactId = id.parse(fd.get("contactId"));
    const o = outcomeSchema.parse(formToObject(fd));
    const contact = requireContact(ctx, contactId);
    registerOutcome(ctx, contactId, {
      type: o.type,
      date: o.date,
      scheduledFor: o.scheduledFor,
      amountCents: o.type === "returned" ? o.amount : null,
      serviceId: o.serviceId,
      createVisit: o.type === "returned" ? o.createVisit : undefined,
      note: o.note,
    });
    campaignPath(contact.campaign_id);
    revalidatePath(`/clientes/${contact.client_id}`);
    revalidatePath("/relatorios");
    return "Resultado registrado.";
  });
}

export async function removeContactAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    const contactId = id.parse(fd.get("contactId"));
    const contact = requireContact(ctx, contactId);
    removeContact(ctx, contactId);
    campaignPath(contact.campaign_id);
    return "Cliente removida da campanha.";
  });
}
