import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert, ButtonLink, Card, Logo } from "@/components/ui";
import { effectiveStatus } from "@/lib/cobro-status";
import { formatDateMX, formatMXN } from "@/lib/format";
import { getPublicCobro } from "@/lib/public-cobro";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pagar", robots: { index: false, follow: false } };

// Página do cliente final (sem cadastro).
export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ collection_status?: string; status?: string; payment_id?: string }>;
}) {
  const { code } = await params;
  const sp = await searchParams;
  const returned = Boolean(sp.payment_id || sp.collection_status || sp.status);
  const result = await getPublicCobro(code, { forceCheck: returned });
  if (result === "limit") {
    return (
      <Shell>
        <Alert kind="warning">Demasiadas consultas. Espera un minuto y vuelve a intentar.</Alert>
      </Shell>
    );
  }
  if (!result) notFound();

  const { cobro, businessName } = result;
  const status = effectiveStatus(cobro);
  const mpStatus = sp.collection_status ?? sp.status;

  return (
    <Shell>
      <Card className="p-6">
        <p className="text-sm text-slate-500">Cobro de</p>
        <p className="text-xl font-bold">{businessName}</p>
        <p className="mt-4 text-slate-700">{cobro.description}</p>
        <p className="mt-2 text-4xl font-extrabold tracking-tight">{formatMXN(cobro.amount)}</p>
        {cobro.due_at && status === "pendiente" ? (
          <p className="mt-1 text-sm text-slate-500">Paga antes del {formatDateMX(cobro.due_at)}</p>
        ) : null}

        <div className="mt-6 space-y-3">
          {status === "pagado" ? (
            <Alert kind="success">
              <b>¡Pago recibido! ✅</b> Mercado Pago confirmó tu pago. {businessName} ya fue avisado.
            </Alert>
          ) : status === "cancelado" ? (
            <Alert kind="warning">Este cobro fue cancelado por el vendedor. Si tienes dudas, contáctalo.</Alert>
          ) : status === "vencido" ? (
            <Alert kind="warning">Este cobro venció. Pídele a {businessName} un link nuevo.</Alert>
          ) : status === "reembolsado" ? (
            <Alert kind="info">Este pago fue reembolsado.</Alert>
          ) : (
            <>
              {mpStatus === "pending" || mpStatus === "in_process" ? (
                <Alert kind="info">
                  <b>Tu pago está en proceso.</b> Si elegiste OXXO o SPEI, completa el pago con la referencia que te dio Mercado
                  Pago. En cuanto se confirme, {businessName} recibe el aviso.
                </Alert>
              ) : mpStatus === "rejected" || mpStatus === "failure" ? (
                <Alert kind="error">El pago no se completó. Puedes intentar de nuevo con otro medio de pago.</Alert>
              ) : null}
              {cobro.checkout_url ? (
                <ButtonLink href={cobro.checkout_url} className="w-full text-lg">
                  Pagar {formatMXN(cobro.amount)}
                </ButtonLink>
              ) : (
                <Alert kind="warning">El link de pago no está disponible. Contacta al vendedor.</Alert>
              )}
              <p className="text-center text-xs text-slate-500">
                Pago seguro procesado por Mercado Pago. El dinero va directo a {businessName}.
              </p>
            </>
          )}
        </div>
      </Card>

      {status === "pendiente" ? (
        <Card className="mt-4 space-y-4 p-6 text-sm text-slate-700">
          <h2 className="text-base font-semibold text-ink">¿Cómo pagar?</h2>
          <div>
            <p className="font-semibold">🏪 En OXXO (efectivo)</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>Toca “Pagar” y elige <b>OXXO</b>.</li>
              <li>Mercado Pago te da una referencia (número o código de barras). Guárdala o toma captura.</li>
              <li>Ve a cualquier OXXO, di que quieres hacer un pago de <b>Mercado Pago</b> y muestra la referencia.</li>
              <li>Paga en efectivo y guarda tu ticket. La confirmación puede tardar unas horas.</li>
            </ol>
          </div>
          <div>
            <p className="font-semibold">🏦 Por SPEI (transferencia)</p>
            <p className="mt-1">
              Elige transferencia/SPEI y usa la CLABE que te muestra Mercado Pago <b>para este pago</b>. No transfieras a otra
              cuenta.
            </p>
          </div>
          <div>
            <p className="font-semibold">💳 Con tarjeta</p>
            <p className="mt-1">Débito o crédito. Se confirma al instante.</p>
          </div>
        </Card>
      ) : null}

      <p className="mt-6 text-center text-xs text-slate-500">
        ¿Quieres comprobar un pago?{" "}
        <a href={`/v/${cobro.public_code}`} className="font-medium text-brand-700 underline">
          Verifica el estado real aquí
        </a>
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 py-8">
      <div className="mb-6 flex justify-center">
        <Logo />
      </div>
      {children}
    </main>
  );
}
