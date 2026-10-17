import { NextResponse } from "next/server";
import { processMercadoPagoWebhook } from "@/lib/payments/service";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Webhook do Mercado Pago. Toda a lógica (assinatura, idempotência, consulta à API)
// está em src/lib/payments/core.ts e é coberta por testes.
export async function POST(request: Request) {
  if (!(await rateLimit(`wh:${clientIp(request.headers)}`, 300, 60))) {
    return NextResponse.json({ ok: false, result: "demasiadas_solicitudes" }, { status: 429 });
  }
  const bodyText = (await request.text()).slice(0, 20_000);
  const res = await processMercadoPagoWebhook({ url: request.url, headers: request.headers, bodyText });
  return NextResponse.json(res.body, { status: res.status });
}
