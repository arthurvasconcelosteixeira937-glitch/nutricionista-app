import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl, getStripe } from "@/lib/stripe";
import { isSubscribed } from "@/lib/subscription";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, stripe_customer_id, stripe_subscription_id, subscription_status, trial_ends_at")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "No encontramos tu cuenta." }, { status: 404 });
  if (isSubscribed(profile) && profile.stripe_subscription_id) {
    return NextResponse.json({ error: "Ya tienes una suscripción activa." }, { status: 409 });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) return NextResponse.json({ error: "Los pagos no están configurados todavía." }, { status: 500 });

  try {
    const stripe = getStripe();
    const base = appUrl(request.nextUrl.origin);

    let customerId = profile.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await createAdminClient().from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    // Si quedan días de prueba, no se cobra hasta que terminen (Stripe exige 48 h mínimo).
    const trialEndsAt = new Date(profile.trial_ends_at).getTime();
    const trialEnd = trialEndsAt - Date.now() > 49 * 3600 * 1000 ? Math.floor(trialEndsAt / 1000) : undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { user_id: user.id },
        ...(trialEnd ? { trial_end: trialEnd } : {}),
      },
      allow_promotion_codes: true,
      locale: "es",
      success_url: `${base}/suscripcion?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/suscripcion?estado=cancelado`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error", error);
    return NextResponse.json({ error: "No pudimos abrir el pago. Intenta de nuevo." }, { status: 500 });
  }
}
