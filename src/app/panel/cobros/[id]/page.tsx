import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CancelButton,
  CheckButton,
  CopyButton,
  ReceiptButton,
  ReminderButton,
  RemindersToggle,
  SendCobroButton,
} from "@/components/cobro-actions";
import { Alert, Card, StatusBadge } from "@/components/ui";
import { PAYMENT_STATUS_LABEL, effectiveStatus } from "@/lib/cobro-status";
import { formatDateMX, formatMXN } from "@/lib/format";
import { payUrl, verifyUrl } from "@/lib/messages";
import { getMessagingProvider } from "@/lib/messaging";
import { formatMxPhone } from "@/lib/phone";
import { MAX_REMINDERS } from "@/lib/reminders";
import { createClient } from "@/lib/supabase/server";
import type { Cobro } from "@/lib/types";

export const metadata: Metadata = { title: "Detalle del cobro" };

const METHOD_LABEL: Record<string, string> = { oxxo: "OXXO", clabe: "SPEI", spei: "SPEI" };

export default async function CobroDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const { id } = await params;
  const { nuevo } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data } = await supabase.from("cobros").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const cobro = data as Cobro;
  const { data: payments } = await supabase
    .from("payments")
    .select("mp_payment_id, status, status_detail, payment_method_id, amount, updated_at")
    .eq("cobro_id", id)
    .order("updated_at", { ascending: false });

  const status = effectiveStatus(cobro);
  const isOpen = status === "pendiente" || status === "vencido";
  const manual = getMessagingProvider().mode === "manual";
  const remaining = Math.max(0, MAX_REMINDERS - cobro.reminders_sent);

  return (
    <div className="space-y-4">
      <Link href="/panel" className="text-sm font-medium text-slate-500 hover:text-slate-800">
        ← Mis cobros
      </Link>

      {nuevo === "manual" ? (
        <Alert kind="success">
          ¡Cobro creado! Ahora mándalo a tu cliente con el botón verde de WhatsApp.
        </Alert>
      ) : nuevo === "enviado" ? (
        <Alert kind="success">¡Cobro creado y enviado por WhatsApp a tu cliente! ✅</Alert>
      ) : nuevo === "fallo" ? (
        <Alert kind="warning">Cobro creado, pero no pudimos enviarlo automáticamente. Usa el botón de WhatsApp.</Alert>
      ) : null}

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-slate-500">{cobro.customer_name}</p>
            <p className="text-3xl font-extrabold tracking-tight">{formatMXN(cobro.amount)}</p>
            <p className="mt-1 text-slate-700">{cobro.description}</p>
          </div>
          <StatusBadge status={status} />
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-slate-500">WhatsApp</dt>
            <dd className="font-medium">{formatMxPhone(cobro.customer_phone)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Creado</dt>
            <dd className="font-medium">{formatDateMX(cobro.created_at, true)}</dd>
          </div>
          {cobro.due_at ? (
            <div>
              <dt className="text-slate-500">Vence</dt>
              <dd className="font-medium">{formatDateMX(cobro.due_at)}</dd>
            </div>
          ) : null}
          {cobro.paid_at ? (
            <div>
              <dt className="text-slate-500">Pagado</dt>
              <dd className="font-medium">
                {formatDateMX(cobro.paid_at, true)}
                {cobro.payment_method ? ` · ${METHOD_LABEL[cobro.payment_method] ?? "Tarjeta"}` : ""}
              </dd>
            </div>
          ) : null}
          {cobro.mp_payment_id ? (
            <div>
              <dt className="text-slate-500">Folio Mercado Pago</dt>
              <dd className="font-medium">{cobro.mp_payment_id}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      {status === "pagado" ? (
        <Card className="space-y-3 bg-brand-50 ring-brand-200">
          <p className="text-lg font-bold text-brand-900">✅ Pago confirmado por Mercado Pago. Ya puedes entregar.</p>
          {manual || !cobro.receipt_sent_at ? <ReceiptButton cobroId={cobro.id} /> : (
            <p className="text-sm text-brand-800">Recibo enviado al cliente el {formatDateMX(cobro.receipt_sent_at, true)}.</p>
          )}
        </Card>
      ) : null}

      {status === "reembolsado" ? (
        <Alert kind="error">Este pago fue reembolsado o contracargado en Mercado Pago. No entregues (o recupera el producto).</Alert>
      ) : null}

      {isOpen ? (
        <Card className="space-y-3">
          <h2 className="font-semibold">Cobrar</h2>
          {status === "pendiente" ? (
            <>
              <SendCobroButton cobroId={cobro.id} label={nuevo ? "Enviar por WhatsApp" : "Enviar de nuevo por WhatsApp"} />
              <CopyButton text={payUrl(cobro.public_code)} label="Copiar link de pago" />
            </>
          ) : (
            <p className="text-sm text-slate-600">Este cobro venció y su link de pago ya no funciona. Si tu cliente aún quiere pagar, crea un cobro nuevo.</p>
          )}
          {status === "pendiente" && remaining > 0 ? <ReminderButton cobroId={cobro.id} remaining={remaining} /> : null}
          {status === "pendiente" && remaining === 0 ? (
            <p className="text-sm text-slate-500">Ya se enviaron los {MAX_REMINDERS} recordatorios de este cobro.</p>
          ) : null}
          <CheckButton cobroId={cobro.id} />
          {status === "pendiente" && !manual ? <RemindersToggle cobroId={cobro.id} enabled={cobro.reminders_enabled} /> : null}
          <p className="text-xs text-slate-500">
            ¿Tu cliente dice que ya pagó? No te fíes de capturas: este cobro cambia a “Pagado ✅” solo cuando Mercado Pago lo
            confirma. Los pagos en OXXO pueden tardar unas horas.
          </p>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <h2 className="font-semibold">Verificación pública</h2>
        <p className="text-sm text-slate-600">
          Cualquier persona puede confirmar el estado real de este pago en este link (consulta directa al servidor).
        </p>
        <CopyButton text={verifyUrl(cobro.public_code)} label="Copiar link de verificación" />
        <a href={`/v/${cobro.public_code}`} target="_blank" className="block text-center text-sm font-medium text-brand-700 underline">
          Abrir verificación
        </a>
      </Card>

      {payments && payments.length > 0 ? (
        <Card>
          <h2 className="mb-3 font-semibold">Movimientos en Mercado Pago</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {payments.map((p) => (
              <li key={p.mp_payment_id} className="flex justify-between gap-3 py-2">
                <span>
                  #{p.mp_payment_id} · {METHOD_LABEL[p.payment_method_id ?? ""] ?? p.payment_method_id ?? "-"}
                </span>
                <span className="font-medium">{PAYMENT_STATUS_LABEL[p.status] ?? p.status}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {isOpen ? (
        <div className="pt-2">
          <CancelButton cobroId={cobro.id} />
        </div>
      ) : null}
    </div>
  );
}
