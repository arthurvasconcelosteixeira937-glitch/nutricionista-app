import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, MessageSquareText, Pencil, Send } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PaymentButton } from "@/components/PaymentButton";
import { ReceiptButton } from "@/components/ReceiptButton";
import { DeleteJobButton, DeletePaymentButton, StopRecurringButton } from "@/components/JobMenuActions";
import { CLIENT_COLUMNS, JOB_COLUMNS, getSupabase, requireAppProfile, syncRecurring } from "@/lib/data";
import { methodLabel, recurrenceLabel } from "@/lib/constants";
import { daysBetween, formatDate, formatDateTime, formatMoney, dateInTz } from "@/lib/format";
import { daysOverdue, jobStatus, remaining } from "@/lib/jobs";
import { TEMPLATE_META } from "@/lib/messages";
import { receiptNumber, type ReceiptData } from "@/lib/receipt";
import type { Client, Job, Payment, Reminder } from "@/lib/types";

export const metadata: Metadata = { title: "Trabajo" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[48px] items-center justify-between gap-4 py-2">
      <dt className="text-[15px] text-ink-muted">{label}</dt>
      <dd className="text-right text-[16px] font-semibold text-ink">{children}</dd>
    </div>
  );
}

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireAppProfile();
  const today = await syncRecurring(profile.timezone);
  const supabase = await getSupabase();

  const { data: jobData } = await supabase.from("jobs").select(JOB_COLUMNS).eq("id", id).maybeSingle();
  if (!jobData) notFound();
  const job = jobData as Job;

  const [clientRes, paymentsRes, remindersRes] = await Promise.all([
    supabase.from("clients").select(CLIENT_COLUMNS).eq("id", job.client_id).single(),
    supabase.from("payments").select("id, job_id, amount, method, paid_on, created_at").eq("job_id", id).order("paid_on").order("created_at"),
    supabase
      .from("reminders_sent")
      .select("id, client_id, job_ids, channel, template, language, message, amount, sent_at")
      .contains("job_ids", [id])
      .order("sent_at", { ascending: false }),
  ]);
  const client = clientRes.data as Client;
  const payments = (paymentsRes.data ?? []) as Payment[];
  const reminders = (remindersRes.data ?? []) as Reminder[];

  const status = jobStatus(job, today);
  const balance = remaining(job);
  const paidPct = Math.min(100, Math.round((Number(job.amount_paid) / Number(job.amount)) * 100));

  const receipt: ReceiptData | null =
    job.is_paid && job.receipt_number
      ? {
          number: job.receipt_number,
          language: client.language,
          businessName: profile.business_name,
          ownerName: profile.full_name,
          clientName: client.name,
          clientPhone: client.phone,
          clientAddress: client.address,
          description: job.description,
          serviceDate: job.service_date,
          amount: Number(job.amount),
          paidDate: payments.at(-1)?.paid_on ?? (job.paid_at ? dateInTz(new Date(job.paid_at), profile.timezone) : today),
          payments: payments.map((p) => ({ paid_on: p.paid_on, method: p.method, amount: Number(p.amount) })),
        }
      : null;

  return (
    <>
      <PageHeader
        title="Trabajo"
        back="/inicio"
        action={
          <Link
            href={`/trabajos/${job.id}/editar`}
            className="flex h-12 w-12 items-center justify-center rounded-full text-brand hover:bg-brand-50"
            aria-label="Editar trabajo"
          >
            <Pencil className="h-5 w-5" />
          </Link>
        }
      />

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/clientes/${client.id}`} className="block truncate text-xl font-bold text-ink underline-offset-2 hover:underline">
              {client.name}
            </Link>
            <p className="mt-0.5 text-[16px] text-ink-soft">{job.description}</p>
          </div>
          <StatusBadge status={status} daysLate={daysOverdue(job, today)} daysToDue={daysBetween(today, job.due_date)} />
        </div>

        <p className="tabular mt-4 text-[38px] font-extrabold leading-none text-ink">{formatMoney(job.is_paid ? job.amount : balance)}</p>
        <p className="mt-1 text-[15px] text-ink-muted">{job.is_paid ? "Cobrado completo" : Number(job.amount_paid) > 0 ? "Falta por cobrar" : "Por cobrar"}</p>

        {!job.is_paid && Number(job.amount_paid) > 0 && (
          <div className="mt-4">
            <div className="h-3 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-brand" style={{ width: `${paidPct}%` }} />
            </div>
            <p className="mt-2 text-[15px] text-ink-soft">
              Te pagaron <strong>{formatMoney(job.amount_paid)}</strong> de <strong>{formatMoney(job.amount)}</strong>
            </p>
          </div>
        )}

        <dl className="mt-4 divide-y divide-gray-100 border-t border-gray-100">
          <Row label="Fecha del trabajo">{formatDate(job.service_date)}</Row>
          <Row label="Vence el">{formatDate(job.due_date)}</Row>
          <Row label="Monto total">{formatMoney(job.amount)}</Row>
          {job.recurrence && <Row label="Trabajo fijo">{recurrenceLabel(job.recurrence)}</Row>}
          {job.receipt_number && job.is_paid && <Row label="Recibo">N.º {receiptNumber(job.receipt_number)}</Row>}
        </dl>
      </Card>

      <div className="mt-4 space-y-3">
        {!job.is_paid ? (
          <>
            <LinkButton href={`/cobrar/${job.id}`} size="lg" full icon={<Send className="h-6 w-6" />}>
              Cobrar
            </LinkButton>
            <PaymentButton job={job} today={today} />
          </>
        ) : (
          receipt && <ReceiptButton data={receipt} />
        )}
        {job.recurrence && !job.next_generated && <StopRecurringButton jobId={job.id} />}
      </div>

      {payments.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-3 text-lg font-bold">Pagos</h2>
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2 pl-4 pr-2">
                <div className="flex-1">
                  <p className="text-[16px] font-semibold">{methodLabel(p.method)}</p>
                  <p className="text-sm text-ink-muted">{formatDate(p.paid_on)}</p>
                </div>
                <span className="tabular text-[16px] font-bold text-brand">{formatMoney(p.amount)}</span>
                <DeletePaymentButton paymentId={p.id} label={formatMoney(p.amount)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {reminders.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-3 text-lg font-bold">Cobros enviados ({reminders.length})</h2>
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
            {reminders.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                {r.channel === "whatsapp" ? (
                  <MessageCircle className="h-5 w-5 shrink-0 text-[#128C4B]" />
                ) : (
                  <MessageSquareText className="h-5 w-5 shrink-0 text-blue-700" />
                )}
                <div className="flex-1">
                  <p className="text-[15px] font-semibold">
                    {TEMPLATE_META[r.template].label} · {r.channel === "whatsapp" ? "WhatsApp" : "SMS"}
                  </p>
                  <p className="text-sm text-ink-muted">{formatDateTime(r.sent_at, profile.timezone)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 border-t border-gray-200 pt-6">
        <DeleteJobButton jobId={job.id} backTo="/inicio" />
      </div>
    </>
  );
}
