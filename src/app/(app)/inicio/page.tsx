import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ClipboardList, PartyPopper, Plus } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PendingJobCard } from "@/components/JobCards";
import { JOB_WITH_CLIENT, getSupabase, requireAppProfile, syncRecurring } from "@/lib/data";
import { firstName, formatMoney, monthStart } from "@/lib/format";
import { sumAmounts, sumRemaining } from "@/lib/jobs";
import type { JobWithClient } from "@/lib/types";

export const metadata: Metadata = { title: "Inicio" };

export default async function HomePage() {
  const profile = await requireAppProfile();
  const today = await syncRecurring(profile.timezone);
  const supabase = await getSupabase();

  const [pendingRes, paymentsRes, countRes] = await Promise.all([
    supabase.from("jobs").select(JOB_WITH_CLIENT).eq("is_paid", false).order("due_date").order("created_at"),
    supabase.from("payments").select("amount").gte("paid_on", monthStart(today)).lte("paid_on", today),
    supabase.from("jobs").select("id", { count: "exact", head: true }),
  ]);
  if (pendingRes.error) throw pendingRes.error;

  const pending = (pendingRes.data ?? []) as unknown as JobWithClient[];
  const owed = sumRemaining(pending);
  const collected = sumAmounts((paymentsRes.data ?? []) as { amount: number }[]);
  const lateClients = new Set(pending.filter((j) => j.due_date < today).map((j) => j.client_id)).size;
  const dueToday = new Set(pending.filter((j) => j.due_date <= today).map((j) => j.client_id)).size;
  const hasJobs = (countRes.count ?? 0) > 0;

  return (
    <>
      <header className="pb-2 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <h1 className="text-[28px] font-extrabold leading-tight text-ink">Hola, {firstName(profile.full_name) || "amigo"} 👋</h1>
        <p className="text-[15px] text-ink-muted">{profile.business_name}</p>
      </header>

      {dueToday > 0 && (
        <Link
          href="#por-cobrar"
          className="mt-3 flex items-center gap-3 rounded-2xl bg-alert px-4 py-4 text-white shadow-sm active:scale-[.99]"
        >
          <AlertTriangle className="h-7 w-7 shrink-0" />
          <span className="text-[17px] font-bold leading-snug">
            Hoy debes cobrar a {dueToday} {dueToday === 1 ? "cliente" : "clientes"}
          </span>
        </Link>
      )}

      <section className="mt-4 space-y-3" aria-label="Resumen">
        <div className="rounded-2xl bg-brand p-5 text-white shadow-card">
          <p className="text-[15px] font-medium text-white/80">Te deben</p>
          <p className="tabular mt-1 text-[40px] font-extrabold leading-none">{formatMoney(owed)}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
            <p className="text-[14px] font-medium text-ink-muted">Cobrado este mes</p>
            <p className="tabular mt-1 text-[24px] font-extrabold text-brand">{formatMoney(collected)}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
            <p className="text-[14px] font-medium text-ink-muted">Clientes atrasados</p>
            <p className={`tabular mt-1 text-[24px] font-extrabold ${lateClients > 0 ? "text-alert" : "text-ink"}`}>{lateClients}</p>
          </div>
        </div>
      </section>

      <section id="por-cobrar" className="mt-7 scroll-mt-4">
        <h2 className="mb-3 text-xl font-bold text-ink">Por cobrar</h2>
        {!hasJobs ? (
          <EmptyState
            icon={<ClipboardList className="h-8 w-8" />}
            title="Aún no tienes trabajos."
            text="¡Agrega el primero! Te ayudamos a cobrarlo."
            action={
              <LinkButton href="/trabajos/nuevo" full icon={<Plus className="h-5 w-5" />}>
                Agregar trabajo
              </LinkButton>
            }
          />
        ) : pending.length === 0 ? (
          <EmptyState
            icon={<PartyPopper className="h-8 w-8" />}
            title="¡Todo cobrado!"
            text="Nadie te debe dinero. ¿Hiciste un trabajo nuevo?"
            action={
              <LinkButton href="/trabajos/nuevo" full variant="secondary" icon={<Plus className="h-5 w-5" />}>
                Nuevo trabajo
              </LinkButton>
            }
          />
        ) : (
          <ul className="space-y-3">
            {pending.map((job) => (
              <PendingJobCard key={job.id} job={job} today={today} />
            ))}
          </ul>
        )}
      </section>
      <div className="h-20" aria-hidden="true" />

      <Link
        href="/trabajos/nuevo"
        className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-4 z-30 inline-flex h-16 items-center gap-2 rounded-full bg-brand pl-5 pr-6 text-[17px] font-bold text-white shadow-float active:scale-95 sm:right-[calc(50%-15rem)]"
      >
        <Plus className="h-7 w-7" strokeWidth={2.6} /> Nuevo trabajo
      </Link>
    </>
  );
}
