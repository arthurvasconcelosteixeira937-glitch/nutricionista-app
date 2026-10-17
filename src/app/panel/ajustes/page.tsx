import type { Metadata } from "next";
import { signOutAction } from "@/app/actions/auth";
import { SettingsForm } from "@/components/seller-forms";
import { Alert, ButtonLink, Card, buttonClass } from "@/components/ui";
import { getSellerContext } from "@/lib/auth";
import { PLAN } from "@/lib/billing";
import { formatDateMX, formatMXN } from "@/lib/format";
import { getMessagingProvider } from "@/lib/messaging";

export const metadata: Metadata = { title: "Ajustes" };

const MP_MESSAGES: Record<string, { kind: "success" | "error" | "warning"; text: string }> = {
  ok: { kind: "success", text: "¡Cuenta de Mercado Pago conectada!" },
  cancelado: { kind: "warning", text: "No se completó la conexión con Mercado Pago." },
  estado_invalido: { kind: "error", text: "La sesión de conexión expiró. Intenta de nuevo." },
  cuenta_en_uso: { kind: "error", text: "Esa cuenta de Mercado Pago ya está conectada a otro usuario." },
  error: { kind: "error", text: "Mercado Pago no respondió. Intenta de nuevo." },
};

export default async function AjustesPage({ searchParams }: { searchParams: Promise<{ mp?: string }> }) {
  const { mp } = await searchParams;
  const ctx = await getSellerContext();
  const { profile, access, subscription } = ctx;
  const mpMsg = mp ? MP_MESSAGES[mp] : undefined;
  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
      {mpMsg ? <Alert kind={mpMsg.kind}>{mpMsg.text}</Alert> : null}

      <Card>
        <h2 className="mb-4 font-semibold">Tu negocio</h2>
        <SettingsForm
          businessName={profile.business_name ?? ""}
          whatsapp={profile.whatsapp ?? ""}
          remindersEnabled={profile.reminders_enabled}
        />
        {getMessagingProvider().mode === "manual" ? (
          <p className="mt-4 text-xs text-slate-500">
            Por ahora los mensajes se envían desde tu WhatsApp con un toque (modo manual). Los recordatorios automáticos se
            activan cuando la plataforma conecte la API oficial de WhatsApp.
          </p>
        ) : null}
      </Card>

      <Card>
        <h2 className="font-semibold">Mercado Pago</h2>
        <p className="mt-1 text-sm text-slate-600">
          {ctx.mpConnected
            ? "✅ Tu cuenta está conectada. Los pagos caen directo en ella."
            : "Tu cuenta no está conectada. Sin ella no puedes crear cobros."}
        </p>
        <ButtonLink href="/api/mp/oauth/start?from=ajustes" variant="secondary" className="mt-4 w-full sm:w-auto">
          {ctx.mpConnected ? "Volver a conectar" : "Conectar Mercado Pago"}
        </ButtonLink>
      </Card>

      <Card>
        <h2 id="suscripcion" className="font-semibold">
          Suscripción
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Plan único: <b>{formatMXN(PLAN.priceMxn)} al mes</b>, con {PLAN.trialDays} días gratis.
        </p>
        <div className="mt-3">
          <Alert kind={access.canCreateCobros ? "success" : "warning"}>{access.message}</Alert>
        </div>
        {subscription?.status === "active" && subscription.current_period_end ? (
          <p className="mt-2 text-sm text-slate-500">Activa hasta el {formatDateMX(subscription.current_period_end)}.</p>
        ) : null}
        {access.state !== "active" ? (
          <p className="mt-3 text-sm text-slate-600">
            Para activar tu suscripción, escríbenos
            {supportPhone ? (
              <>
                {" "}
                por{" "}
                <a
                  className="font-semibold text-brand-700 underline"
                  href={`https://wa.me/${supportPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Hola, quiero activar mi suscripción de CobroSeguro. Mi correo es ${ctx.user.email}`,
                  )}`}
                >
                  WhatsApp
                </a>
              </>
            ) : null}{" "}
            y te enviamos los datos de pago.
          </p>
        ) : null}
      </Card>

      <Card>
        <p className="text-sm text-slate-600">Sesión iniciada como {ctx.user.email}</p>
        <form action={signOutAction} className="mt-3">
          <button className={buttonClass("secondary", "w-full sm:w-auto")}>Cerrar sesión</button>
        </form>
      </Card>
    </div>
  );
}
