import Link from "next/link";
import { ChevronRight, Repeat, Send } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { daysBetween, formatDate, formatMoney } from "@/lib/format";
import { daysOverdue, isPartial, jobStatus, remaining } from "@/lib/jobs";
import type { Job, JobWithClient } from "@/lib/types";

/** Tarjeta de cobro pendiente con botón "Cobrar" (Inicio). */
export function PendingJobCard({ job, today }: { job: JobWithClient; today: string }) {
  const status = jobStatus(job, today);
  return (
    <li className="rounded-2xl border border-gray-100 bg-white shadow-card">
      <Link href={`/trabajos/${job.id}`} className="block px-4 pb-2 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[17px] font-bold text-ink">{job.client.name}</p>
            <p className="truncate text-[15px] text-ink-muted">{job.description}</p>
          </div>
          <div className="text-right">
            <p className="tabular text-[18px] font-extrabold text-ink">{formatMoney(remaining(job))}</p>
            {isPartial(job) && <p className="text-xs text-ink-muted">de {formatMoney(job.amount)}</p>}
          </div>
        </div>
      </Link>
      <div className="flex items-center justify-between gap-3 px-4 pb-4 pt-1">
        <StatusBadge status={status} daysLate={daysOverdue(job, today)} daysToDue={daysBetween(today, job.due_date)} />
        <Link
          href={`/cobrar/${job.id}`}
          className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-brand px-5 text-[16px] font-bold text-white shadow-sm active:scale-[.98]"
        >
          <Send className="h-5 w-5" /> Cobrar
        </Link>
      </div>
    </li>
  );
}

/** Fila simple de trabajo (Historial, Cliente). */
export function JobRow({ job, today, clientName }: { job: Job; today: string; clientName?: string }) {
  const status = jobStatus(job, today);
  return (
    <li>
      <Link href={`/trabajos/${job.id}`} className="flex min-h-[72px] items-center gap-3 px-4 py-3 active:bg-gray-50">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold text-ink">{clientName ?? job.description}</p>
          <p className="flex items-center gap-1 truncate text-sm text-ink-muted">
            {clientName ? `${job.description} · ` : ""}
            {formatDate(job.service_date)}
            {job.recurrence && <Repeat className="h-3.5 w-3.5 shrink-0" aria-label="Trabajo fijo" />}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="tabular text-[16px] font-bold text-ink">{formatMoney(job.amount)}</p>
          <StatusBadge status={status} daysLate={daysOverdue(job, today)} className="!px-2 !py-0.5 !text-xs" />
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
      </Link>
    </li>
  );
}
