import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { runReminders } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Cron de lembretes automáticos (máx. 2 por cobro, só 9h–20h no México).
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(await runReminders());
}
