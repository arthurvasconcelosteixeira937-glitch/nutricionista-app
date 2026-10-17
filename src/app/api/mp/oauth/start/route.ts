import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { buildAuthorizationUrl } from "@/lib/mercadopago/oauth";
import { oauthConfig } from "@/lib/mercadopago/tokens";

export const dynamic = "force-dynamic";

// Inicia o OAuth: guarda um "state" aleatório em cookie (proteção CSRF) e manda o vendedor ao Mercado Pago.
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login", env.appUrl()));

  const from = new URL(request.url).searchParams.get("from") === "ajustes" ? "ajustes" : "onboarding";
  const state = `${randomBytes(24).toString("base64url")}.${from}`;
  const res = NextResponse.redirect(buildAuthorizationUrl(oauthConfig(), state));
  res.cookies.set("mp_oauth_state", `${user.id}:${state}`, {
    httpOnly: true,
    secure: env.appUrl().startsWith("https://"),
    sameSite: "lax",
    path: "/api/mp/oauth",
    maxAge: 600,
  });
  return res;
}
