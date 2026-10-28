"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireContext } from "@/lib/auth/session";
import { formToObject, safeAction } from "@/lib/actions";
import type { ActionState } from "@/lib/action-state";
import { clientSchema, requiredVisitSchema, visitSchema } from "@/lib/validation";
import {
  addVisit,
  clearOptOut,
  createClient,
  deleteClient,
  deleteVisit,
  setOptOut,
  updateClient,
} from "@/lib/repos/clients";
import { commitImport, previewImport, type ImportResult } from "@/lib/repos/imports";
import { logAudit } from "@/lib/repos/audit";
import { DomainError } from "@/lib/domain/errors";
import { MAX_IMPORT_ROWS, type ValidatedImportRow } from "@/lib/domain/import";

const idSchema = z.uuid("Identificador inválido.");

export async function createClientAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    const raw = formToObject(fd);
    const input = clientSchema.parse(raw);
    const visit = visitSchema.parse(raw);
    const id = createClient(
      ctx,
      input,
      visit.visitDate ? { serviceId: visit.serviceId, visitDate: visit.visitDate, amountCents: visit.amount } : null,
    );
    logAudit(ctx, "client.create", "client", id);
    revalidatePath("/clientes");
    redirect(`/clientes/${id}?criado=1`);
  });
}

export async function updateClientAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    const raw = formToObject(fd);
    const id = idSchema.parse(raw.id);
    updateClient(ctx, id, clientSchema.parse(raw));
    logAudit(ctx, "client.update", "client", id);
    revalidatePath(`/clientes/${id}`);
    return "Dados da cliente atualizados.";
  });
}

export async function addVisitAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    const raw = formToObject(fd);
    const id = idSchema.parse(raw.clientId);
    const v = requiredVisitSchema.parse(raw);
    addVisit(ctx, id, { serviceId: v.serviceId, visitDate: v.visitDate, amountCents: v.amount, origin: "manual", campaignId: null });
    logAudit(ctx, "client.visit_add", "client", id);
    revalidatePath(`/clientes/${id}`);
    return "Visita registrada.";
  });
}

export async function deleteVisitAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    const clientId = idSchema.parse(fd.get("clientId"));
    deleteVisit(ctx, clientId, idSchema.parse(fd.get("visitId")));
    revalidatePath(`/clientes/${clientId}`);
    return "Visita removida.";
  });
}

export async function optOutAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    const id = idSchema.parse(fd.get("id"));
    const note = String(fd.get("note") ?? "").trim().slice(0, 300) || null;
    setOptOut(ctx, id, note);
    logAudit(ctx, "client.opt_out", "client", id);
    revalidatePath(`/clientes/${id}`);
    return "Pedido registrado. A cliente não será incluída em novas campanhas.";
  });
}

export async function clearOptOutAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    const id = idSchema.parse(fd.get("id"));
    clearOptOut(ctx, id);
    logAudit(ctx, "client.update", "client", id, { optOutCleared: true });
    revalidatePath(`/clientes/${id}`);
    return "Registro removido. Confirme a autorização da cliente antes de novos contatos.";
  });
}

export async function deleteClientAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const ctx = await requireContext();
    const id = idSchema.parse(fd.get("id"));
    deleteClient(ctx, id);
    logAudit(ctx, "client.delete", "client", id);
    revalidatePath("/clientes");
    redirect("/clientes?excluido=1");
  });
}

// --- Importação -------------------------------------------------------------

const rawRowsSchema = z
  .array(z.record(z.string(), z.string().max(2000)))
  .max(MAX_IMPORT_ROWS, `Importe no máximo ${MAX_IMPORT_ROWS} linhas por vez.`);

export type PreviewResult = { ok: true; rows: ValidatedImportRow[] } | { ok: false; message: string };
export type CommitResult = { ok: true; result: ImportResult } | { ok: false; message: string };

function errorMessage(err: unknown): string {
  if (err instanceof DomainError) return err.message;
  if (err instanceof z.ZodError) return err.issues[0]?.message ?? "Dados inválidos.";
  console.error("[importacao]", err);
  return "Não foi possível processar a planilha.";
}

export async function previewImportAction(rows: unknown): Promise<PreviewResult> {
  const ctx = await requireContext();
  try {
    return { ok: true, rows: previewImport(ctx, rawRowsSchema.parse(rows)) };
  } catch (err) {
    return { ok: false, message: errorMessage(err) };
  }
}

export async function commitImportAction(
  rows: unknown,
  fileName: string,
  consentConfirmed: boolean,
): Promise<CommitResult> {
  const ctx = await requireContext();
  try {
    const result = commitImport(ctx, rawRowsSchema.parse(rows), { consentConfirmed: consentConfirmed === true });
    logAudit(ctx, "import.commit", "import", null, { arquivo: String(fileName).slice(0, 120), ...result });
    revalidatePath("/clientes");
    return { ok: true, result };
  } catch (err) {
    return { ok: false, message: errorMessage(err) };
  }
}
