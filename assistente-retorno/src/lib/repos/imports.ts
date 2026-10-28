import "server-only";
import { randomUUID } from "node:crypto";
import { run, transaction } from "@/lib/db";
import type { TenantContext } from "@/lib/auth/context";
import { DomainError } from "@/lib/domain/errors";
import { MAX_IMPORT_ROWS, validateImportRows, type RawImportRow, type ValidatedImportRow } from "@/lib/domain/import";
import { assertClientCapacity, existingPhones } from "./clients";
import { ensureService } from "./services";

export function previewImport(ctx: TenantContext, rows: RawImportRow[]): ValidatedImportRow[] {
  if (rows.length === 0) throw new DomainError("A planilha não tem linhas de dados.");
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new DomainError(`Importe no máximo ${MAX_IMPORT_ROWS} linhas por vez.`);
  }
  return validateImportRows(rows, existingPhones(ctx));
}

export interface ImportResult {
  imported: number;
  skippedInvalid: number;
  skippedDuplicates: number;
}

/**
 * Grava as linhas válidas e não duplicadas. A validação é refeita no servidor;
 * o que veio da prévia do navegador não é considerado confiável.
 * Importar NÃO dispara nenhuma mensagem.
 */
export function commitImport(
  ctx: TenantContext,
  rows: RawImportRow[],
  options: { consentConfirmed: boolean },
): ImportResult {
  const validated = previewImport(ctx, rows);
  const toImport = validated
    .filter((r) => r.errors.length === 0 && !r.duplicateOf)
    // Sem a confirmação explícita, "autorizou" da planilha não vira consentimento registrado.
    .map((r) => (r.consent === "granted" && !options.consentConfirmed ? { ...r, consent: "not_informed" as const } : r));
  assertClientCapacity(ctx, toImport.length);
  const now = new Date().toISOString();
  transaction(() => {
    for (const r of toImport) {
      const clientId = randomUUID();
      run(
        `INSERT INTO clients (id, tenant_id, name, phone, notes, contact_source, legal_basis, consent_status,
                              consent_recorded_at, next_visit_date, is_demo, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        clientId,
        ctx.tenantId,
        r.name,
        r.phone,
        r.notes,
        r.source ?? "Planilha importada",
        r.consent === "granted" ? "consentimento" : null,
        r.consent,
        r.consent === "not_informed" ? null : now,
        r.nextVisit,
        now,
        now,
      );
      if (r.lastVisit) {
        const service = r.service ? ensureService(ctx, r.service) : null;
        run(
          `INSERT INTO visits (id, tenant_id, client_id, service_id, service_name, visit_date, amount_cents, origin, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'import', ?)`,
          randomUUID(),
          ctx.tenantId,
          clientId,
          service?.id ?? null,
          service?.name ?? null,
          r.lastVisit,
          r.amountCents,
          now,
        );
      }
    }
  });
  return {
    imported: toImport.length,
    skippedInvalid: validated.filter((r) => r.errors.length > 0).length,
    skippedDuplicates: validated.filter((r) => r.errors.length === 0 && r.duplicateOf).length,
  };
}
