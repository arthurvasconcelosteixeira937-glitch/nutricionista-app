import { getSession } from "@/lib/auth/session";
import { exportClientData } from "@/lib/repos/clients";
import { logAudit } from "@/lib/repos/audit";
import { NotFoundError } from "@/lib/domain/errors";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new Response("Não autenticado.", { status: 401 });
  const { id } = await params;
  try {
    const data = exportClientData(session, id);
    logAudit(session, "client.export", "client", id);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="cliente-${id.slice(0, 8)}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof NotFoundError) return new Response("Não encontrado.", { status: 404 });
    throw err;
  }
}
