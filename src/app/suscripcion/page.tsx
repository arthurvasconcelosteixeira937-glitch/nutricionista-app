import type { Metadata } from "next";
import Link from "next/link";
import { PROFILE_COLUMNS, getSupabase, requireProfile } from "@/lib/data";
import type { Profile } from "@/lib/types";
import { getStripe } from "@/lib/stripe";
import { syncSubscription } from "@/lib/stripe-sync";
import { hasAccess, isSubscribed, trialDaysLeft } from "@/lib/subscription";
import { dateInTz, formatDate } from "@/lib/format";
import { Logo } from "@/components/ui/Logo";
import { SubscriptionView } from "./SubscriptionView";

export const metadata: Metadata = { title: "Suscripción" };

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; estado?: string }>;
}) {
  const sp = await searchParams;
  let profile = await requireProfile();
  let justSubscribed = false;

  // Al volver de Stripe sincronizamos de inmediato (sin esperar al webhook)
  if (sp.session_id && /^cs_[A-Za-z0-9_]+$/.test(sp.session_id)) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sp.session_id);
      if (session.client_reference_id === profile.id && session.subscription) {
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        await syncSubscription(subId, profile.id);
        const supabase = await getSupabase();
        const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", profile.id).single();
        if (data) profile = { ...profile, ...(data as Profile), timezone: profile.timezone };
        justSubscribed = true;
      }
    } catch (error) {
      console.error("No se pudo sincronizar la suscripción", error);
    }
  }

  const subscribed = isSubscribed(profile);
  const access = hasAccess(profile);
  const renewal = profile.subscription_current_period_end
    ? formatDate(dateInTz(new Date(profile.subscription_current_period_end), profile.timezone))
    : null;

  return (
    <main className="min-h-dvh bg-brand-50">
      <div className="mx-auto max-w-md px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="mb-6 flex justify-center">
          <Link href={access ? "/inicio" : "/suscripcion"} aria-label="Cóbralo">
            <Logo />
          </Link>
        </div>
        <SubscriptionView
          state={subscribed ? (profile.subscription_status === "past_due" ? "past_due" : "active") : access ? "trial" : "expired"}
          wasSubscribed={Boolean(profile.stripe_subscription_id)}
          trialDays={trialDaysLeft(profile)}
          renewal={renewal}
          hasCustomer={Boolean(profile.stripe_customer_id)}
          justSubscribed={justSubscribed && subscribed}
          cancelled={sp.estado === "cancelado"}
        />
      </div>
    </main>
  );
}
