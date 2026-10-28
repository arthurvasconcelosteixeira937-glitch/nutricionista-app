"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireContext, destroySession } from "@/lib/auth/session";
import { formToObject, safeAction } from "@/lib/actions";
import type { ActionState } from "@/lib/action-state";
import { serviceSchema, settingsSchema } from "@/lib/validation";
import { setPlan, updateTenantSettings, getTenant } from "@/lib/repos/tenants";
import { upsertService } from "@/lib/repos/services";
import { deleteTenant, purgeRetention, requireOwner } from "@/lib/repos/privacy";
import { logAudit } from "@/lib/repos/audit";
import { getDb, transaction } from "@/lib/db";
import { removeDemoData, seedDemoData } from "@/lib/db/seed";
import { countClients } from "@/lib/repos/clients";
import { DomainError } from "@/lib/domain/errors";

export async function updateSettingsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    requireOwner(ctx);
    updateTenantSettings(ctx, settingsSchema.parse(formToObject(fd)));
    logAudit(ctx, "settings.update", "tenant", ctx.tenantId);
    revalidatePath("/", "layout");
    return "Configurações salvas.";
  });
}

export async function upsertServiceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    requireOwner(ctx);
    const input = serviceSchema.parse(formToObject(fd));
    upsertService(ctx, { id: input.id, name: input.name, returnIntervalDays: input.returnIntervalDays });
    logAudit(ctx, "service.upsert", "service", input.id, { nome: input.name, prazo: input.returnIntervalDays });
    revalidatePath("/configuracoes");
    revalidatePath("/reativacao");
    return input.id ? "Serviço atualizado." : "Serviço adicionado.";
  });
}

export async function changePlanAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    requireOwner(ctx);
    const plan = z.enum(["piloto", "basico", "avancado"]).parse(fd.get("plan"));
    setPlan(ctx, plan);
    logAudit(ctx, "plan.change", "tenant", ctx.tenantId, { plano: plan });
    revalidatePath("/configuracoes");
    return "Plano alterado (simulação, sem cobrança).";
  });
}

export async function purgeRetentionAction(_: ActionState): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    const n = purgeRetention(ctx);
    logAudit(ctx, "data.retention_purge", "tenant", ctx.tenantId, { excluidos: n });
    revalidatePath("/", "layout");
    return `${n} cliente(s) excluída(s).`;
  });
}

export async function loadDemoAction(_: ActionState): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    requireOwner(ctx);
    if (countClients(ctx) > 0) throw new DomainError("Carregue dados demonstrativos apenas numa conta sem clientes.");
    transaction(() => seedDemoData(getDb(), ctx.tenantId, { clients: 30, seed: Date.now() % 100000, phoneBase: 1000 }));
    logAudit(ctx, "demo.load", "tenant", ctx.tenantId);
    revalidatePath("/", "layout");
    return "Dados fictícios carregados. Eles estão marcados como “Fictícia” em todas as telas.";
  });
}

export async function removeDemoAction(_: ActionState): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    requireOwner(ctx);
    transaction(() => removeDemoData(getDb(), ctx.tenantId));
    logAudit(ctx, "demo.remove", "tenant", ctx.tenantId);
    revalidatePath("/", "layout");
    return "Dados demonstrativos removidos.";
  });
}

export async function deleteAccountAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    requireOwner(ctx);
    const tenant = getTenant(ctx);
    if (String(fd.get("confirmName") ?? "").trim() !== tenant.name) {
      throw new DomainError("O nome digitado não confere.");
    }
    deleteTenant(ctx);
    await destroySession();
    redirect("/login");
  });
}
