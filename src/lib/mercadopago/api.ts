// Chamadas à API do Mercado Pago (https://api.mercadopago.com).
// Sempre com o access_token DO VENDEDOR (obtido via OAuth): o dinheiro cai na conta dele.
import type { MpPayment } from "../types";

// MP_API_URL só existe para testes locais com um servidor falso; em produção use o padrão.
const API = process.env.MP_API_URL ?? "https://api.mercadopago.com";

export class MercadoPagoError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
  }
}

async function mpFetch<T>(path: string, token: string, init: RequestInit = {}, fetchImpl: typeof fetch = fetch): Promise<T> {
  const res = await fetchImpl(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (body as { message?: string } | null)?.message ?? res.statusText;
    throw new MercadoPagoError(`Mercado Pago ${res.status}: ${msg}`, res.status, body);
  }
  return body as T;
}

// ---------------------------------------------------------------------------
// Pagamentos
// ---------------------------------------------------------------------------

export function getPayment(token: string, paymentId: string, fetchImpl?: typeof fetch): Promise<MpPayment> {
  if (!/^\d{1,20}$/.test(paymentId)) throw new MercadoPagoError("ID de pago inválido", 400);
  return mpFetch<MpPayment>(`/v1/payments/${paymentId}`, token, {}, fetchImpl);
}

/** Busca pagamentos de um cobro (usado pelo cron de conciliação). */
export async function searchPaymentsByExternalReference(
  token: string,
  externalReference: string,
  fetchImpl?: typeof fetch,
): Promise<MpPayment[]> {
  const qs = new URLSearchParams({
    external_reference: externalReference,
    sort: "date_created",
    criteria: "desc",
    limit: "20",
  });
  const data = await mpFetch<{ results: MpPayment[] }>(`/v1/payments/search?${qs}`, token, {}, fetchImpl);
  return data.results ?? [];
}

// ---------------------------------------------------------------------------
// Preferências (Checkout Pro)
// ---------------------------------------------------------------------------

export interface PreferenceInput {
  cobroId: string;
  publicCode: string;
  title: string;
  amount: number;
  appUrl: string;
  /** ISO com offset do México. Se informado, o link expira nessa data. */
  expiresAt?: string;
}

/**
 * Corpo da preferência do Checkout Pro.
 * - external_reference = id do cobro (é assim que ligamos o pagamento ao cobro).
 * - Não excluímos "ticket" (OXXO) nem "bank_transfer" (SPEI): no México eles aparecem
 *   no Checkout Pro desde que estejam habilitados na conta do vendedor.
 * - installments: 1 → sem meses sem juros (simplifica para o pequeno vendedor).
 */
export function buildPreferenceBody(input: PreferenceInput) {
  const isHttps = input.appUrl.startsWith("https://");
  const backUrl = `${input.appUrl}/p/${input.publicCode}`;
  return {
    items: [
      {
        id: input.cobroId,
        title: input.title.slice(0, 250),
        quantity: 1,
        currency_id: "MXN",
        unit_price: input.amount,
      },
    ],
    external_reference: input.cobroId,
    metadata: { cobro_id: input.cobroId },
    back_urls: { success: backUrl, pending: backUrl, failure: backUrl },
    // O Mercado Pago exige URLs públicas https para auto_return e notification_url.
    ...(isHttps
      ? {
          auto_return: "approved",
          notification_url: `${input.appUrl}/api/webhooks/mercadopago?source_news=webhooks`,
        }
      : {}),
    payment_methods: {
      excluded_payment_types: [] as { id: string }[],
      excluded_payment_methods: [] as { id: string }[],
      installments: 1,
    },
    ...(input.expiresAt
      ? {
          expires: true,
          expiration_date_to: input.expiresAt,
          // Vencimento do ticket de OXXO / referência SPEI
          date_of_expiration: input.expiresAt,
        }
      : {}),
  };
}

export interface MpPreference {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
}

export function createPreference(token: string, input: PreferenceInput, fetchImpl?: typeof fetch): Promise<MpPreference> {
  return mpFetch<MpPreference>(
    "/checkout/preferences",
    token,
    {
      method: "POST",
      body: JSON.stringify(buildPreferenceBody(input)),
      headers: { "X-Idempotency-Key": `pref-${input.cobroId}` },
    },
    fetchImpl,
  );
}

/** Faz o link de pagamento expirar agora (usado ao cancelar um cobro). */
export function expirePreference(token: string, preferenceId: string, nowIso: string, fetchImpl?: typeof fetch) {
  return mpFetch<MpPreference>(
    `/checkout/preferences/${encodeURIComponent(preferenceId)}`,
    token,
    { method: "PUT", body: JSON.stringify({ expires: true, expiration_date_to: nowIso }) },
    fetchImpl,
  );
}
