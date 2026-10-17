import "server-only";
import { decryptSecret, encryptSecret } from "../crypto";
import { env } from "../env";
import { createAdminClient } from "../supabase/admin";
import { needsRefresh, refreshAccessToken, type OAuthConfig, type OAuthTokenResponse } from "./oauth";

export function oauthConfig(): OAuthConfig {
  return {
    clientId: env.mpClientId(),
    clientSecret: env.mpClientSecret(),
    redirectUri: `${env.appUrl()}/api/mp/oauth/callback`,
    authUrl: env.mpAuthUrl(),
    testToken: env.mpOauthTestToken(),
  };
}

export interface MpAccountRow {
  seller_id: string;
  mp_user_id: string;
  access_token_enc: string;
  refresh_token_enc: string | null;
  expires_at: string;
  live_mode: boolean;
}

/** Salva (criptografado) o resultado do OAuth. */
export async function saveMpTokens(sellerId: string, t: OAuthTokenResponse) {
  const key = env.tokenEncryptionKey();
  const { error } = await createAdminClient()
    .from("mp_accounts")
    .upsert(
      {
        seller_id: sellerId,
        mp_user_id: String(t.user_id),
        access_token_enc: encryptSecret(t.access_token, key),
        refresh_token_enc: t.refresh_token ? encryptSecret(t.refresh_token, key) : null,
        public_key: t.public_key ?? null,
        scope: t.scope ?? null,
        live_mode: Boolean(t.live_mode),
        expires_at: new Date(Date.now() + (t.expires_in || 15552000) * 1000).toISOString(),
      },
      { onConflict: "seller_id" },
    );
  if (error) throw new Error(`No se pudo guardar la cuenta de Mercado Pago: ${error.message}`);
}

export async function getMpAccount(sellerId: string): Promise<MpAccountRow | null> {
  const { data } = await createAdminClient()
    .from("mp_accounts")
    .select("seller_id, mp_user_id, access_token_enc, refresh_token_enc, expires_at, live_mode")
    .eq("seller_id", sellerId)
    .maybeSingle();
  return (data as MpAccountRow | null) ?? null;
}

export async function getMpAccountByMpUserId(mpUserId: string): Promise<MpAccountRow | null> {
  const { data } = await createAdminClient()
    .from("mp_accounts")
    .select("seller_id, mp_user_id, access_token_enc, refresh_token_enc, expires_at, live_mode")
    .eq("mp_user_id", mpUserId)
    .maybeSingle();
  return (data as MpAccountRow | null) ?? null;
}

/**
 * Retorna um access_token válido do vendedor, renovando antes de expirar.
 * Se a renovação falhar mas o token atual ainda valer, usa o atual.
 */
export async function getValidAccessToken(account: MpAccountRow, now = new Date()): Promise<string> {
  const key = env.tokenEncryptionKey();
  const current = decryptSecret(account.access_token_enc, key);
  if (!needsRefresh(account.expires_at, now) || !account.refresh_token_enc) return current;

  try {
    const refreshed = await refreshAccessToken(oauthConfig(), decryptSecret(account.refresh_token_enc, key));
    await saveMpTokens(account.seller_id, refreshed);
    return refreshed.access_token;
  } catch (e) {
    console.error("[mp] falha ao renovar token", account.seller_id, e);
    if (new Date(account.expires_at).getTime() > now.getTime()) return current;
    throw new Error("La conexión con Mercado Pago expiró. Vuelve a conectar tu cuenta.");
  }
}
