/** Só aceita caminhos internos ("/panel"), nunca URLs externas ("//evil.com"). */
export function safeNext(next: string | null | undefined, fallback = "/panel"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
