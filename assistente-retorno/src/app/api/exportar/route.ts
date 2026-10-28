import { getSession } from "@/lib/auth/session";
import { exportTenantData } from "@/lib/repos/privacy";
import { logAudit } from "@/lib/repos/audit";
import { DomainError } from "@/lib/domain/errors";

export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Não autenticado.", { status: 401 });
  try {
    const data = exportTenantData(session);
    logAudit(session, "data.export", "tenant", session.tenantId);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="assistente-retorno-dados-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof DomainError) return new Response(err.message, { status: 403 });
    throw err;
  }
}
