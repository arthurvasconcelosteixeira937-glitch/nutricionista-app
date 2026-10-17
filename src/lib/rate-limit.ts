import "server-only";
import { createAdminClient } from "./supabase/admin";

/**
 * Rate limit em Postgres (função rate_limit_hit). Funciona em serverless,
 * onde memória local não é compartilhada entre instâncias.
 * Retorna true se a requisição pode seguir. Se o banco falhar, deixa passar
 * (fail-open) para não derrubar o webhook — a segurança real está na assinatura.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient().rpc("rate_limit_hit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("[rate-limit]", error.message);
      return true;
    }
    return data === true;
  } catch (e) {
    console.error("[rate-limit]", e);
    return true;
  }
}

/** IP do cliente (a Vercel coloca o IP real no primeiro item do x-forwarded-for). */
export function clientIp(headers: { get(name: string): string | null }): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "desconocido";
}
