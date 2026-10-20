import "server-only";
import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripe) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Falta STRIPE_SECRET_KEY.");
  stripe = new Stripe(key, { appInfo: { name: "Cobralo" } });
  return stripe;
}

export function appUrl(fallbackOrigin?: string): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || fallbackOrigin || "http://localhost:3000";
  return url.replace(/\/$/, "");
}

/** Periodo actual: en versiones nuevas de la API vive en los items. */
export function periodEnd(sub: Stripe.Subscription): string | null {
  const raw =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    (sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined)?.current_period_end;
  return raw ? new Date(raw * 1000).toISOString() : null;
}

export function subscriptionUpdate(sub: Stripe.Subscription) {
  return {
    stripe_subscription_id: sub.id,
    subscription_status: sub.status,
    subscription_current_period_end: periodEnd(sub),
  };
}
