// OAuth do Mercado Pago (modelo marketplace): o vendedor autoriza o CobroSeguro
// a criar cobranças na conta DELE. O dinheiro nunca passa por nós.
// Doc: Developers → Seguridad → OAuth (Crear / Renovar access token).

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  testToken?: boolean;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // segundos (padrão 15552000 = 180 dias)
  scope?: string;
  user_id: number;
  refresh_token?: string;
  public_key?: string;
  live_mode?: boolean;
}

export function buildAuthorizationUrl(cfg: OAuthConfig, state: string): string {
  const url = new URL(cfg.authUrl);
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", cfg.redirectUri);
  return url.toString();
}

async function postToken(body: Record<string, unknown>, fetchImpl: typeof fetch = fetch): Promise<OAuthTokenResponse> {
  const res = await fetchImpl(`${process.env.MP_API_URL ?? "https://api.mercadopago.com"}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as (OAuthTokenResponse & { message?: string }) | null;
  if (!res.ok || !data?.access_token) {
    throw new Error(`OAuth Mercado Pago falhou (${res.status}): ${data?.message ?? "sem detalhes"}`);
  }
  return data;
}

export function exchangeCodeForToken(cfg: OAuthConfig, code: string, fetchImpl?: typeof fetch) {
  return postToken(
    {
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: cfg.redirectUri,
      ...(cfg.testToken ? { test_token: true } : {}),
    },
    fetchImpl,
  );
}

/** Renova o token. ATENÇÃO: o refresh_token também muda e precisa ser salvo de novo. */
export function refreshAccessToken(cfg: OAuthConfig, refreshToken: string, fetchImpl?: typeof fetch) {
  return postToken(
    {
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    },
    fetchImpl,
  );
}

/** Renovamos quando faltar menos que isto para expirar. */
export const REFRESH_BEFORE_MS = 30 * 86_400_000;

export function needsRefresh(expiresAt: string | Date, now = new Date()): boolean {
  return new Date(expiresAt).getTime() - now.getTime() < REFRESH_BEFORE_MS;
}
