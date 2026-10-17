import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BusinessForm, WhatsappForm } from "@/components/seller-forms";
import { Alert, ButtonLink, Logo, cx } from "@/components/ui";
import { getSellerContext } from "@/lib/auth";

export const metadata: Metadata = { title: "Configura tu cuenta" };
export const dynamic = "force-dynamic";

const MP_MESSAGES: Record<string, { kind: "success" | "error" | "warning"; text: string }> = {
  ok: { kind: "success", text: "¡Listo! Tu cuenta de Mercado Pago quedó conectada." },
  cancelado: { kind: "warning", text: "No se completó la conexión con Mercado Pago. Intenta de nuevo." },
  estado_invalido: { kind: "error", text: "La sesión de conexión expiró. Intenta de nuevo." },
  cuenta_en_uso: { kind: "error", text: "Esa cuenta de Mercado Pago ya está conectada a otro usuario de CobroSeguro." },
  error: { kind: "error", text: "Mercado Pago no respondió. Intenta de nuevo en unos minutos." },
};

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ mp?: string; paso?: string }> }) {
  const { mp, paso } = await searchParams;
  const ctx = await getSellerContext();
  const { profile, mpConnected } = ctx;

  let step = !profile.business_name ? 1 : !mpConnected ? 2 : !profile.whatsapp ? 3 : 4;
  if (paso === "1") step = 1;
  if (step === 4) {
    // Conectou o MP depois de já ter salvo o WhatsApp: confirma o número para concluir.
    if (!profile.onboarding_completed) step = 3;
    else redirect("/panel");
  }
  const mpMsg = mp ? MP_MESSAGES[mp] : undefined;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-8">
      <Logo />
      <ol className="mt-8 flex gap-2" aria-label="Progreso">
        {[1, 2, 3].map((n) => (
          <li key={n} className={cx("h-2 flex-1 rounded-full", n <= step ? "bg-brand-600" : "bg-slate-200")}>
            <span className="sr-only">Paso {n}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm font-medium text-slate-500">Paso {step} de 3</p>

      {mpMsg ? (
        <div className="mt-4">
          <Alert kind={mpMsg.kind}>{mpMsg.text}</Alert>
        </div>
      ) : null}

      {step === 1 && (
        <section className="mt-6">
          <h1 className="text-2xl font-bold tracking-tight">¿Cómo se llama tu negocio?</h1>
          <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <BusinessForm defaultValue={profile.business_name} />
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="mt-6">
          <h1 className="text-2xl font-bold tracking-tight">Conecta tu Mercado Pago</h1>
          <p className="mt-2 text-slate-600">
            Los pagos caen <b>directo en tu cuenta</b>. CobroSeguro nunca toca tu dinero: solo crea los links de pago y confirma
            con Mercado Pago cuando te pagan.
          </p>
          <div className="mt-6 space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <ul className="space-y-2 text-sm text-slate-700">
              <li>✓ Usa tu cuenta de Mercado Pago México</li>
              <li>✓ Aceptas OXXO, SPEI y tarjeta</li>
              <li>✓ Puedes desconectarla cuando quieras desde Mercado Pago</li>
            </ul>
            <ButtonLink href="/api/mp/oauth/start" className="w-full">
              Conectar con Mercado Pago
            </ButtonLink>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Te llevaremos a la página oficial de Mercado Pago para que autorices a CobroSeguro.
          </p>
        </section>
      )}

      {step === 3 && (
        <section className="mt-6">
          <h1 className="text-2xl font-bold tracking-tight">¿A qué WhatsApp te avisamos?</h1>
          <p className="mt-2 text-slate-600">Cuando un cliente te pague, te mandamos: “✅ Pago confirmado… Ya puedes entregar.”</p>
          <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <WhatsappForm defaultValue={profile.whatsapp} />
          </div>
        </section>
      )}
    </main>
  );
}
