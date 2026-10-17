import type { Metadata } from "next";
import Link from "next/link";
import { Alert, ButtonLink, Card, StatusBadge, cx } from "@/components/ui";
import { getSellerContext } from "@/lib/auth";
import { effectiveStatus } from "@/lib/cobro-status";
import { formatDateMX, formatMXN } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { startOfMxDay, startOfMxMonth } from "@/lib/time";
import type { Cobro, CobroStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Mis cobros" };

const FILTERS: { key: "todos" | CobroStatus; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "pendiente", label: "Pendiente" },
  { key: "pagado", label: "Pagado ✅" },
  { key: "vencido", label: "Vencido" },
  { key: "cancelado", label: "Cancelado" },
];

export default async function PanelPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; bienvenida?: string; contrasena?: string }>;
}) {
  const { estado = "todos", bienvenida, contrasena } = await searchParams;
  const ctx = await getSellerContext();
  const supabase = await createClient();
  const now = new Date();
  const monthStart = startOfMxMonth(now);
  const dayStart = startOfMxDay(now);

  const [{ data: cobrosData }, { data: paidData }] = await Promise.all([
    supabase.from("cobros").select("*").order("created_at", { ascending: false }).limit(200),
    supabase
      .from("cobros")
      .select("paid_amount, amount, paid_at")
      .eq("status", "pagado")
      .gte("paid_at", monthStart.toISOString()),
  ]);
  const cobros = (cobrosData ?? []) as Cobro[];
  const paid = (paidData ?? []) as Pick<Cobro, "paid_amount" | "amount" | "paid_at">[];

  const sum = (rows: typeof paid) => rows.reduce((acc, r) => acc + Number(r.paid_amount ?? r.amount), 0);
  const today = paid.filter((r) => r.paid_at && new Date(r.paid_at) >= dayStart);
  const pendingTotal = cobros
    .filter((c) => effectiveStatus(c, now) === "pendiente")
    .reduce((acc, c) => acc + Number(c.amount), 0);

  const list = estado === "todos" ? cobros : cobros.filter((c) => effectiveStatus(c, now) === estado);

  return (
    <div className="space-y-6">
      {bienvenida ? (
        <Alert kind="success">¡Tu cuenta está lista! Crea tu primer cobro y mándalo por WhatsApp.</Alert>
      ) : null}
      {contrasena ? <Alert kind="success">Tu contraseña se actualizó.</Alert> : null}
      {!ctx.mpConnected ? (
        <Alert kind="warning">
          Tu cuenta de Mercado Pago no está conectada.{" "}
          <a href="/api/mp/oauth/start?from=ajustes" className="font-semibold underline">Conectar ahora</a>
        </Alert>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Hola,</p>
          <h1 className="text-2xl font-bold tracking-tight">{ctx.profile.business_name}</h1>
        </div>
        {ctx.access.canCreateCobros ? (
          <ButtonLink href="/panel/cobros/nuevo" className="hidden sm:inline-flex">
            + Nuevo cobro
          </ButtonLink>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Cobrado hoy</p>
          <p className="mt-1 text-xl font-bold text-brand-800">{formatMXN(sum(today))}</p>
          <p className="text-xs text-slate-500">{today.length} pago(s)</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Cobrado este mes</p>
          <p className="mt-1 text-xl font-bold text-brand-800">{formatMXN(sum(paid))}</p>
          <p className="text-xs text-slate-500">{paid.length} pago(s)</p>
        </Card>
        <Card className="col-span-2 p-4 sm:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Por cobrar</p>
          <p className="mt-1 text-xl font-bold text-amber-700">{formatMXN(pendingTotal)}</p>
          <p className="text-xs text-slate-500">pendiente</p>
        </Card>
      </div>

      {ctx.access.canCreateCobros ? (
        <ButtonLink href="/panel/cobros/nuevo" className="w-full sm:hidden">
          + Nuevo cobro
        </ButtonLink>
      ) : (
        <Alert kind="warning">
          {ctx.access.message}{" "}
          <Link href="/panel/ajustes#suscripcion" className="font-semibold underline">
            Activar suscripción
          </Link>
        </Alert>
      )}

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "todos" ? "/panel" : `/panel?estado=${f.key}`}
              className={cx(
                "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ring-1",
                estado === f.key ? "bg-ink text-white ring-ink" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <Card className="text-center text-slate-500">
          {cobros.length === 0 ? "Todavía no tienes cobros. ¡Crea el primero!" : "No hay cobros con este estado."}
        </Card>
      ) : (
        <ul className="space-y-3">
          {list.map((c) => {
            const st = effectiveStatus(c, now);
            return (
              <li key={c.id}>
                <Link
                  href={`/panel/cobros/${c.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:ring-brand-300"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{c.customer_name}</p>
                    <p className="truncate text-sm text-slate-500">{c.description}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDateMX(c.created_at, true)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold">{formatMXN(c.amount)}</p>
                    <StatusBadge status={st} className="mt-1" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
