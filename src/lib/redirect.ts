/** Solo permite redirecciones internas (evita open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/inicio"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
