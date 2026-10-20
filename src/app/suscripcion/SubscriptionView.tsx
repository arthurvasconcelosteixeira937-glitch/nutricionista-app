"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, CheckCircle2, Clock, Lock, LogOut, MessageCircle, ShieldCheck } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";
import { PRICE_LABEL, SUPPORT_URL } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

type State = "active" | "past_due" | "trial" | "expired";

async function goTo(endpoint: string) {
  const res = await fetch(endpoint, { method: "POST" });
  const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !body.url) throw new Error(body.error || "Algo salió mal. Intenta de nuevo.");
  window.location.href = body.url;
}

const FEATURES = ["Clientes y trabajos ilimitados", "Cobros por WhatsApp y SMS", "Recibos en PDF", "Cancela cuando quieras"];

export function SubscriptionView({
  state,
  wasSubscribed,
  trialDays,
  renewal,
  hasCustomer,
  justSubscribed,
  cancelled,
}: {
  state: State;
  wasSubscribed: boolean;
  trialDays: number;
  renewal: string | null;
  hasCustomer: boolean;
  justSubscribed: boolean;
  cancelled: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"checkout" | "portal" | "logout" | null>(null);

  async function run(kind: "checkout" | "portal") {
    setLoading(kind);
    try {
      await goTo(kind === "checkout" ? "/api/stripe/checkout" : "/api/stripe/portal");
    } catch (e) {
      toast((e as Error).message, "error");
      setLoading(null);
    }
  }

  async function logout() {
    setLoading("logout");
    await createClient().auth.signOut();
    router.replace("/");
    router.refresh();
  }

  const subscribeCard = (
    <div className="rounded-3xl bg-white p-6 shadow-card">
      <p className="font-semibold text-brand">Plan Cóbralo</p>
      <p className="mt-1">
        <span className="text-4xl font-extrabold">{PRICE_LABEL}</span>
        <span className="text-ink-muted"> al mes</span>
      </p>
      <ul className="mt-4 space-y-2 text-[16px]">
        {FEATURES.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <Check className="h-5 w-5 shrink-0 text-brand" /> {f}
          </li>
        ))}
      </ul>
      <Button size="lg" full className="mt-6" loading={loading === "checkout"} disabled={!!loading} onClick={() => run("checkout")}>
        Suscribirme
      </Button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-ink-muted">
        <ShieldCheck className="h-4 w-4" /> Pago seguro con Stripe
      </p>
    </div>
  );

  return (
    <div className="space-y-5">
      {cancelled && state !== "active" && (
        <p className="rounded-2xl bg-white px-4 py-3 text-center text-[15px] text-ink-soft shadow-card">
          No se completó el pago. Puedes intentarlo cuando quieras.
        </p>
      )}

      {state === "active" && (
        <div className="rounded-3xl bg-white p-6 text-center shadow-card">
          <CheckCircle2 className="mx-auto h-14 w-14 text-brand" />
          <h1 className="mt-3 text-2xl font-extrabold">{justSubscribed ? "¡Gracias por suscribirte!" : "Tu suscripción está activa"}</h1>
          <p className="mt-2 text-ink-soft">
            {PRICE_LABEL} al mes.{renewal ? ` Próximo cobro: ${renewal}.` : ""}
          </p>
          <div className="mt-6 space-y-2">
            <LinkButton href="/inicio" size="lg" full>
              Ir al inicio
            </LinkButton>
            {hasCustomer && (
              <Button variant="outline" full loading={loading === "portal"} disabled={!!loading} onClick={() => run("portal")}>
                Cambiar tarjeta o cancelar
              </Button>
            )}
          </div>
        </div>
      )}

      {state === "past_due" && (
        <div className="rounded-3xl bg-white p-6 text-center shadow-card">
          <AlertTriangle className="mx-auto h-14 w-14 text-alert" />
          <h1 className="mt-3 text-2xl font-extrabold">Hay un problema con tu pago</h1>
          <p className="mt-2 text-ink-soft">No pudimos cobrar tu suscripción. Actualiza tu tarjeta para no perder el acceso.</p>
          <div className="mt-6 space-y-2">
            <Button variant="alert" size="lg" full loading={loading === "portal"} disabled={!!loading} onClick={() => run("portal")}>
              Actualizar tarjeta
            </Button>
            <LinkButton href="/inicio" variant="ghost" full>
              Ir al inicio
            </LinkButton>
          </div>
        </div>
      )}

      {state === "trial" && (
        <>
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-brand shadow-sm">
              <Clock className="h-4 w-4" /> Prueba gratis
            </span>
            <h1 className="mt-3 text-3xl font-extrabold">
              Te {trialDays === 1 ? "queda 1 día" : `quedan ${trialDays} días`}
            </h1>
            <p className="mt-2 text-ink-soft">
              {trialDays > 2
                ? "Suscríbete ahora y no pierdes los días gratis: el primer cobro será cuando termine tu prueba."
                : "Suscríbete para seguir cobrando a tus clientes sin interrupciones."}
            </p>
          </div>
          {subscribeCard}
          <LinkButton href="/ajustes" variant="ghost" full>
            Volver
          </LinkButton>
        </>
      )}

      {state === "expired" && (
        <>
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-alert shadow-card">
              <Lock className="h-10 w-10" />
            </div>
            <h1 className="mt-4 text-3xl font-extrabold">{wasSubscribed ? "Tu suscripción terminó" : "Tu prueba terminó"}</h1>
            <p className="mx-auto mt-2 max-w-xs text-[17px] text-ink-soft">
              Tus datos están guardados y seguros. Suscríbete para seguir cobrando a tus clientes.
            </p>
          </div>
          {subscribeCard}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl font-semibold text-brand hover:bg-white"
            >
              <MessageCircle className="h-5 w-5" /> Soporte
            </a>
            <Button variant="ghost" icon={<LogOut className="h-5 w-5" />} loading={loading === "logout"} disabled={!!loading} onClick={logout}>
              Cerrar sesión
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
