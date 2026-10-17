import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { runReconcile } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Cron de segurança: confere no Mercado Pago os cobros pendentes.
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(await runReconcile());
}
