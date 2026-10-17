import type { Metadata } from "next";
import Link from "next/link";
import { activateSellerAction, deactivateSellerAction } from "@/app/actions/admin";
import { Card, Logo, buttonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { computeAccess } from "@/lib/billing/access";
import { formatDateMX } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Subscription } from "@/lib/types";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  email: string;
  business_name: string | null;
  whatsapp: string | null;
  created_at: string;
  subscriptions: Subscription | Subscription[] | null;
  cobros: { count: number }[];
};

const STATE_LABEL = { trial: "Prueba", active: "Activa", expired: "Vencida", inactive: "Inactiva" } as const;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q } = await searchParams;
  const admin = createAdminClient();
  let query = admin
    .from("profiles")
    .select("id, email, business_name, whatsapp, created_at, subscriptions(*), cobros(count)")
    .order("created_at", { ascending: false })
    .limit(200);
  // Só letras, números, @ . _ - e espaço: evita injetar operadores no filtro do PostgREST.
  const term = (q ?? "").replace(/[^\p{L}\p{N}@._\- ]/gu, "").trim().slice(0, 60);
  if (term) query = query.or(`email.ilike.%${term}%,business_name.ilike.%${term}%`);
  const { data, error } = await query;
  const { data: mp } = await admin.from("mp_accounts").select("seller_id");
  const connected = new Set((mp ?? []).map((m) => m.seller_id as string));
  const rows = (data ?? []) as Row[];

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center justify-between">
        <Logo />
        <Link href="/panel" className="text-sm font-medium text-slate-600 hover:underline">
          Ir a mi panel
        </Link>
      </div>
      <h1 className="mt-6 text-2xl font-bold">Vendedores ({rows.length})</h1>
      <form className="mt-4 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por correo o negocio"
          className="w-full rounded-xl border border-slate-300 px-4 py-2"
        />
        <button className={buttonClass("secondary", "py-2")}>Buscar</button>
      </form>
      {error ? <p className="mt-4 text-red-600">Error: {error.message}</p> : null}

      <div className="mt-6 space-y-3">
        {rows.map((r) => {
          const sub = Array.isArray(r.subscriptions) ? (r.subscriptions[0] ?? null) : r.subscriptions;
          const access = computeAccess(sub);
          return (
            <Card key={r.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 text-sm">
                  <p className="truncate font-semibold">{r.business_name ?? "(sin nombre)"}</p>
                  <p className="truncate text-slate-600">{r.email}</p>
                  <p className="text-slate-500">
                    Alta: {formatDateMX(r.created_at)} · Cobros: {r.cobros?.[0]?.count ?? 0} · MP:{" "}
                    {connected.has(r.id) ? "✅" : "—"}
                  </p>
                  <p className="mt-1">
                    Suscripción: <b>{STATE_LABEL[access.state]}</b>
                    {sub?.status === "trialing" ? ` (termina ${formatDateMX(sub.trial_ends_at)})` : ""}
                    {sub?.status === "active" && sub.current_period_end ? ` (hasta ${formatDateMX(sub.current_period_end)})` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={activateSellerAction}>
                    <input type="hidden" name="seller_id" value={r.id} />
                    <button className={buttonClass("primary", "px-3 py-2 text-sm")}>
                      {access.state === "active" ? "+30 días" : "Activar 30 días"}
                    </button>
                  </form>
                  <form action={deactivateSellerAction}>
                    <input type="hidden" name="seller_id" value={r.id} />
                    <button className={buttonClass("danger", "px-3 py-2 text-sm")}>Desactivar</button>
                  </form>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
