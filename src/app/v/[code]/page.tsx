import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Card, Logo, cx } from "@/components/ui";
import { effectiveStatus } from "@/lib/cobro-status";
import { env } from "@/lib/env";
import { formatDateMX, formatMXN } from "@/lib/format";
import { getPublicCobro, maskName } from "@/lib/public-cobro";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verificar pago", robots: { index: false, follow: false } };

// Verificação pública: mostra o status REAL, consultado no servidor (nunca confiar em print).
export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const result = await getPublicCobro(code);
  if (result === "limit") {
    return (
      <Shell>
        <Alert kind="warning">Demasiadas consultas. Espera un minuto y vuelve a intentar.</Alert>
      </Shell>
    );
  }
  if (!result) notFound();

  const { cobro, businessName, checkedAt } = result;
  const appHost = new URL(env.appUrl()).host;
  const status = effectiveStatus(cobro);
  const paid = status === "pagado";

  const headline = paid
    ? "PAGO CONFIRMADO ✅"
    : status === "reembolsado"
      ? "PAGO REEMBOLSADO"
      : status === "cancelado"
        ? "COBRO CANCELADO"
        : "PAGO NO CONFIRMADO";

  return (
    <Shell>
      <Card className={cx("p-6 text-center ring-2", paid ? "bg-brand-50 ring-brand-500" : "bg-amber-50 ring-amber-300")}>
        <p className={cx("text-2xl font-extrabold tracking-tight", paid ? "text-brand-800" : "text-amber-800")}>{headline}</p>
        <p className="mt-2 text-sm text-slate-700">
          {paid
            ? "Mercado Pago confirmó que el dinero está aprobado en la cuenta del vendedor."
            : status === "pendiente" || status === "vencido"
              ? "Mercado Pago todavía no confirma este pago. Si te mandaron un comprobante, no lo des por bueno."
              : "Este cobro no tiene un pago válido."}
        </p>
      </Card>

      <Card className="mt-4 p-6">
        <dl className="space-y-3 text-sm">
          <Row label="Negocio" value={businessName} />
          <Row label="Cliente" value={maskName(cobro.customer_name)} />
          <Row label="Concepto" value={cobro.description} />
          <Row label="Monto" value={formatMXN(cobro.amount)} />
          {paid && cobro.paid_at ? <Row label="Pagado el" value={formatDateMX(cobro.paid_at, true)} /> : null}
          {paid && cobro.mp_payment_id ? <Row label="Folio Mercado Pago" value={cobro.mp_payment_id} /> : null}
          <Row label="Consultado" value={formatDateMX(checkedAt, true)} />
        </dl>
      </Card>

      <p className="mt-6 text-center text-xs text-slate-500">
        Esta página consulta el estado directo en el servidor de CobroSeguro, conectado con Mercado Pago. Las capturas de pantalla
        se pueden editar; esta página no.
      </p>
      <p className="mt-2 text-center text-xs font-medium text-slate-600">
        Revisa que la dirección empiece con <span className="font-mono">{appHost}</span>
      </p>
      <p className="mt-4 text-center text-sm">
        <Link href="/" className="font-medium text-brand-700 underline">
          ¿Vendes por redes? Conoce CobroSeguro
        </Link>
      </p>
    </Shell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
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
