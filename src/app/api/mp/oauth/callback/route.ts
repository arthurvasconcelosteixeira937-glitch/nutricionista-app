import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { exchangeCodeForToken } from "@/lib/mercadopago/oauth";
import { oauthConfig, saveMpTokens } from "@/lib/mercadopago/tokens";

export const dynamic = "force-dynamic";

// Retorno do OAuth do Mercado Pago.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code");
  const from = state.endsWith(".ajustes") ? "/panel/ajustes" : "/onboarding";
  const back = (q: string) => {
    const res = NextResponse.redirect(new URL(`${from}?mp=${q}`, env.appUrl()));
    res.cookies.delete({ name: "mp_oauth_state", path: "/api/mp/oauth" });
    return res;
  };

  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login", env.appUrl()));

  const cookie = request.cookies.get("mp_oauth_state")?.value ?? "";
  if (!state || cookie !== `${user.id}:${state}`) return back("estado_invalido");
  if (!code) return back("cancelado");

  try {
    const tokens = await exchangeCodeForToken(oauthConfig(), code);
    await saveMpTokens(user.id, tokens);
    return back("ok");
  } catch (e) {
    console.error("[mp oauth]", e);
    // 23505 = esta conta do MP já está ligada a outro vendedor
    return back(String(e).includes("duplicate") ? "cuenta_en_uso" : "error");
  }
}
