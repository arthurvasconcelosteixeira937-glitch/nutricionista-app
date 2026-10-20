import "server-only";
import { createAdminClient } from "./supabase/admin";
import { getStripe, subscriptionUpdate } from "./stripe";

const ACTIVE: string[] = ["active", "trialing", "past_due"];

/** Copia el estado de una suscripción de Stripe al perfil del usuario. */
export async function syncSubscription(subscriptionId: string, userIdHint?: string | null) {
  const stripe = getStripe();
  // Siempre leemos el estado actual en Stripe: así el orden de los eventos no importa.
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const userId = userIdHint || sub.metadata?.user_id || null;
  const admin = createAdminClient();
  const values = { ...subscriptionUpdate(sub), stripe_customer_id: customerId };

  const query = admin.from("profiles").select("id, stripe_subscription_id");
  const { data: profile, error: findError } = await (userId
    ? query.eq("id", userId)
    : query.eq("stripe_customer_id", customerId)
  ).maybeSingle();
  if (findError) throw findError;
  if (!profile) {
    console.warn(`Stripe webhook: no profile for subscription ${sub.id}`);
    return;
  }
  // Una suscripción vieja (cancelada) no debe pisar a la suscripción actual.
  const isCurrent = !profile.stripe_subscription_id || profile.stripe_subscription_id === sub.id;
  if (!isCurrent && !ACTIVE.includes(sub.status)) return;

  const { error } = await admin.from("profiles").update(values).eq("id", profile.id);
  if (error) throw error;
}
