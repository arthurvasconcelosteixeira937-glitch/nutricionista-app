import "server-only";
// Leitura de cobros para as páginas públicas /p e /v (sem login).
// Só expõe campos seguros e nunca o telefone do cliente.
import { headers } from "next/headers";
import { isPlausiblePublicCode } from "./codes";
import { reconcileCobro } from "./payments/service";
import { clientIp, rateLimit } from "./rate-limit";
import { createAdminClient } from "./supabase/admin";
import type { Cobro } from "./types";

export interface PublicCobro {
  cobro: Cobro;
  businessName: string;
  checkedAt: Date;
}

/** "Ana López" → "Ana L." (privacidade na página pública) */
export function maskName(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.pop();
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

async function load(code: string) {
  const { data } = await createAdminClient()
    .from("cobros")
    .select("*, profiles!inner(business_name)")
    .eq("public_code", code)
    .maybeSingle();
  return data as (Cobro & { profiles: { business_name: string | null } }) | null;
}

/**
 * Carrega o cobro e, se ainda não estiver pago, consulta o Mercado Pago na hora
 * (com rate limit por IP e por cobro) — a página mostra o status REAL.
 */
export async function getPublicCobro(code: string, opts: { forceCheck?: boolean } = {}): Promise<PublicCobro | null | "limit"> {
  if (!isPlausiblePublicCode(code)) return null;
  const ip = clientIp(await headers());
  if (!(await rateLimit(`pub:${ip}`, 60, 60))) return "limit";

  let row = await load(code);
  if (!row) return null;

  const open = row.status === "pendiente" || row.status === "vencido";
  const lastCheck = row.last_checked_at ? new Date(row.last_checked_at).getTime() : 0;
  const stale = Date.now() - lastCheck > (opts.forceCheck ? 5_000 : 30_000);
  if (open && stale && row.mp_preference_id && (await rateLimit(`pubcheck:${row.id}`, 6, 60))) {
    try {
      await reconcileCobro(row);
      row = (await load(code)) ?? row;
    } catch (e) {
      console.error("[public] no se pudo consultar MP", e);
    }
  }

  const { profiles, ...cobro } = row;
  return {
    cobro,
    businessName: profiles.business_name ?? "Vendedor",
    checkedAt: cobro.last_checked_at ? new Date(cobro.last_checked_at) : new Date(),
  };
}
