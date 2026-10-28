import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { DomainError } from "@/lib/domain/errors";
import type { ActionState } from "@/lib/action-state";

/**
 * Envolve uma server action: converte erros de regra/validação em mensagens para a interface
 * e esconde detalhes de erros inesperados (que vão apenas para o log do servidor).
 */
export async function safeAction(
  fn: () => Promise<string | void> | string | void,
): Promise<ActionState> {
  try {
    const message = await fn();
    return { ok: true, message: message || "Salvo com sucesso.", at: Date.now() };
  } catch (err) {
    unstable_rethrow(err); // deixa redirect()/notFound() seguirem
    if (err instanceof ZodError) {
      return {
        ok: false,
        message: "Revise os campos destacados.",
        errors: err.issues.map((i) => i.message),
        at: Date.now(),
      };
    }
    if (err instanceof DomainError) return { ok: false, message: err.message, at: Date.now() };
    console.error("[acao] erro inesperado", err);
    return { ok: false, message: "Algo deu errado. Tente novamente.", at: Date.now() };
  }
}

export function formToObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && !k.startsWith("$ACTION")) out[k] = v;
  return out;
}
