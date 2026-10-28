import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, History, Plus } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { JobRow } from "@/components/JobCards";
import { LinkPending } from "@/components/LinkPending";
import { JOB_WITH_CLIENT, getSupabase, requireAppProfile, syncRecurring } from "@/lib/data";
import { cn } from "@/lib/cn";
import { formatMoney, monthEnd, monthLabel, shiftMonth } from "@/lib/format";
import { sumAmounts, sumRemaining } from "@/lib/jobs";
import type { Job, JobWithClient } from "@/lib/types";

export const metadata: Metadata = { title: "Historial" };

const FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "pendientes", label: "Pendientes" },
  { value: "atrasados", label: "Atrasados" },
  { value: "pagados", label: "Pagados" },
] as const;
type Filter = (typeof FILTERS)[number]["value"];

const PAGE = 50;

function href(params: { filtro: Filter; mes: string; limite?: number }) {
  const sp = new URLSearchParams({ filtro: params.filtro, mes: params.mes });
  if (params.limite && params.limite > PAGE) sp.set("limite", String(params.limite));
  return `/historial?${sp.toString()}`;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; mes?: string; limite?: string }>;
}) {
  const sp = await searchParams;
  const profile = await requireAppProfile();
  const today = await syncRecurring(profile.timezone);
  const supabase = await getSupabase();

  const filtro: Filter = FILTERS.some((f) => f.value === sp.filtro) ? (sp.filtro as Filter) : "todos";
  const currentMonth = today.slice(0, 7);
  const mes = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.mes ?? "") && sp.mes! <= currentMonth ? sp.mes! : currentMonth;
  const limite = Math.min(500, Math.max(PAGE, Number(sp.limite) || PAGE));
  const from = `${mes}-01`;
  const to = monthEnd(mes);

  let listQuery = supabase
    .from("jobs")
    .select(JOB_WITH_CLIENT)
    .order("service_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limite + 1);
  if (filtro === "pendientes") listQuery = listQuery.eq("is_paid", false).gte("due_date", today);
  if (filtro === "atrasados") listQuery = listQuery.eq("is_paid", false).lt("due_date", today);
  if (filtro === "pagados") listQuery = listQuery.eq("is_paid", true);

  const [listRes, monthJobsRes, monthPaymentsRes] = await Promise.all([
    listQuery,
    supabase.from("jobs").select("amount, amount_paid").gte("service_date", from).lte("service_date", to),
    supabase.from("payments").select("amount").gte("paid_on", from).lte("paid_on", to),
  ]);
  if (listRes.error) throw listRes.error;

  const rows = (listRes.data ?? []) as unknown as JobWithClient[];
  const hasMore = rows.length > limite;
  const jobs = rows.slice(0, limite);
  const monthJobs = (monthJobsRes.data ?? []) as Pick<Job, "amount" | "amount_paid">[];
  const worked = sumAmounts(monthJobs);
  const received = sumAmounts((monthPaymentsRes.data ?? []) as { amount: number }[]);
  const missing = sumRemaining(monthJobs);

  return (
    <>
      <PageHeader title="Historial" />

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card" aria-label="Resumen del mes">
        <div className="flex items-center justify-between">
          <Link
            href={href({ filtro, mes: shiftMonth(mes, -1) })}
            className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="Mes anterior"
            scroll={false}
            prefetch={false}
          >
            <LinkPending>
              <ChevronLeft className="h-6 w-6" />
            </LinkPending>
          </Link>
          <p className="text-[17px] font-bold">{monthLabel(mes)}</p>
          {mes < currentMonth ? (
            <Link
              href={href({ filtro, mes: shiftMonth(mes, 1) })}
              className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-gray-100"
              aria-label="Mes siguiente"
              scroll={false}
              prefetch={false}
            >
              <LinkPending>
                <ChevronRight className="h-6 w-6" />
              </LinkPending>
            </Link>
          ) : (
            <span className="h-12 w-12" />
          )}
        </div>
        <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-gray-50 px-1 py-3">
            <dt className="text-[13px] font-medium text-ink-muted">Trabajaste</dt>
            <dd className="tabular mt-1 text-[17px] font-extrabold">{formatMoney(worked)}</dd>
          </div>
          <div className="rounded-xl bg-brand-50 px-1 py-3">
            <dt className="text-[13px] font-medium text-ink-muted">Recibiste</dt>
            <dd className="tabular mt-1 text-[17px] font-extrabold text-brand">{formatMoney(received)}</dd>
          </div>
          <div className="rounded-xl bg-alert-light/60 px-1 py-3">
            <dt className="text-[13px] font-medium text-ink-muted">Falta</dt>
            <dd className="tabular mt-1 text-[17px] font-extrabold text-alert-dark">{formatMoney(missing)}</dd>
          </div>
        </dl>
      </section>

      <nav className="mt-5 grid grid-cols-4 gap-1 rounded-2xl bg-gray-100 p-1" aria-label="Filtrar trabajos">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={href({ filtro: f.value, mes })}
            scroll={false}
            prefetch={false}
            aria-current={filtro === f.value ? "true" : undefined}
            className={cn(
              "flex min-h-[48px] items-center justify-center rounded-xl px-1 text-[13.5px] font-semibold tracking-tight transition",
              filtro === f.value ? "bg-brand text-white shadow-sm" : "text-ink-soft"
            )}
          >
            <LinkPending>{f.label}</LinkPending>
          </Link>
        ))}
      </nav>

      <section className="mt-4">
        {jobs.length === 0 ? (
          filtro === "todos" ? (
            <EmptyState
              icon={<History className="h-8 w-8" />}
              title="Aún no tienes trabajos."
              text="¡Agrega el primero! Aquí verás todo lo que has hecho."
              action={
                <LinkButton href="/trabajos/nuevo" full icon={<Plus className="h-5 w-5" />}>
                  Nuevo trabajo
                </LinkButton>
              }
            />
          ) : (
            <p className="rounded-2xl border-2 border-dashed border-gray-200 bg-white px-4 py-8 text-center text-ink-muted">
              {filtro === "atrasados"
                ? "¡Bien! No tienes trabajos atrasados."
                : filtro === "pendientes"
                  ? "No tienes trabajos pendientes."
                  : "Todavía no tienes trabajos pagados."}
            </p>
          )
        ) : (
          <>
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
              {jobs.map((j) => (
                <JobRow key={j.id} job={j} today={today} clientName={j.client.name} />
              ))}
            </ul>
            {hasMore && (
              <LinkButton href={href({ filtro, mes, limite: limite + PAGE })} variant="outline" full className="mt-4" scroll={false}>
                Ver más
              </LinkButton>
            )}
          </>
        )}
      </section>
    </>
  );
}
