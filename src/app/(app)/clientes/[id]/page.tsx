import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, MapPin, MessageCircle, MessageSquareText, Pencil, Phone, Plus, Send, StickyNote } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { JobRow } from "@/components/JobCards";
import { CLIENT_COLUMNS, JOB_COLUMNS, getSupabase, requireAppProfile, syncRecurring } from "@/lib/data";
import { formatDateTime, formatMoney, formatPhone, initials } from "@/lib/format";
import { sumRemaining } from "@/lib/jobs";
import { TEMPLATE_META } from "@/lib/messages";
import type { Client, Job, Reminder } from "@/lib/types";

export const metadata: Metadata = { title: "Cliente" };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireAppProfile();
  const today = await syncRecurring(profile.timezone);
  const supabase = await getSupabase();

  const [clientRes, jobsRes, remindersRes] = await Promise.all([
    supabase.from("clients").select(CLIENT_COLUMNS).eq("id", id).maybeSingle(),
    supabase.from("jobs").select(JOB_COLUMNS).eq("client_id", id).order("service_date", { ascending: false }).order("created_at", { ascending: false }),
    supabase
      .from("reminders_sent")
      .select("id, client_id, job_ids, channel, template, language, message, amount, sent_at")
      .eq("client_id", id)
      .order("sent_at", { ascending: false })
      .limit(50),
  ]);
  if (!clientRes.data) notFound();

  const client = clientRes.data as Client;
  const jobs = (jobsRes.data ?? []) as Job[];
  const reminders = (remindersRes.data ?? []) as Reminder[];
  const unpaid = jobs.filter((j) => !j.is_paid);
  const owed = sumRemaining(unpaid);
  const late = unpaid.some((j) => j.due_date < today);
  const digits = client.phone.replace(/\D/g, "");

  return (
    <>
      <PageHeader
        title={client.name}
        back="/clientes"
        action={
          <Link
            href={`/clientes/${client.id}/editar`}
            className="flex h-12 w-12 items-center justify-center rounded-full text-brand hover:bg-brand-50"
            aria-label="Editar cliente"
          >
            <Pencil className="h-5 w-5" />
          </Link>
        }
      />

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-light text-lg font-bold text-brand">
            {initials(client.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-bold">{client.name}</p>
            <p className="text-[15px] text-ink-muted">
              {formatPhone(client.phone)} · {client.language === "en" ? "English" : "Español"}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a href={`tel:${client.phone}`} className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-gray-100 font-semibold text-ink">
            <Phone className="h-5 w-5" /> Llamar
          </a>
          <a
            href={`https://wa.me/${digits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-gray-100 font-semibold text-ink"
          >
            <MessageCircle className="h-5 w-5" /> WhatsApp
          </a>
        </div>
        {(client.address || client.notes) && (
          <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-[15px] text-ink-soft">
            {client.address && (
              <p className="flex gap-2">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" /> {client.address}
              </p>
            )}
            {client.notes && (
              <p className="flex gap-2 whitespace-pre-line">
                <StickyNote className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" /> {client.notes}
              </p>
            )}
          </div>
        )}
      </Card>

      <div className={`mt-4 rounded-2xl p-5 shadow-card ${owed > 0 && late ? "bg-alert text-white" : "bg-brand text-white"}`}>
        <p className="text-[15px] font-medium text-white/85">{owed > 0 ? "Te debe" : "No te debe nada"}</p>
        <p className="tabular mt-1 text-[36px] font-extrabold leading-none">{formatMoney(owed)}</p>
        {unpaid.length > 0 && (
          <p className="mt-1 text-sm text-white/85">
            {unpaid.length} {unpaid.length === 1 ? "trabajo pendiente" : "trabajos pendientes"}
          </p>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {owed > 0 ? (
          <LinkButton href={`/cobrar/cliente/${client.id}`} size="lg" icon={<Send className="h-5 w-5" />}>
            Cobrar todo
          </LinkButton>
        ) : (
          <span />
        )}
        <LinkButton
          href={`/trabajos/nuevo?cliente=${client.id}`}
          size="lg"
          variant="secondary"
          icon={<Plus className="h-5 w-5" />}
          className={owed > 0 ? "" : "col-span-2"}
        >
          Nuevo trabajo
        </LinkButton>
      </div>

      <section className="mt-7">
        <h2 className="mb-3 text-lg font-bold">Trabajos</h2>
        {jobs.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-8 w-8" />}
            title="Sin trabajos todavía."
            text={`Anota el primer trabajo para ${client.name.split(" ")[0]}.`}
          />
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
            {jobs.map((j) => (
              <JobRow key={j.id} job={j} today={today} />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-7">
        <h2 className="mb-3 text-lg font-bold">Cobros enviados</h2>
        {reminders.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-gray-200 bg-white px-4 py-6 text-center text-ink-muted">
            Todavía no le has enviado cobros.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
            {reminders.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    r.channel === "whatsapp" ? "bg-[#DCF8C6] text-[#128C4B]" : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {r.channel === "whatsapp" ? <MessageCircle className="h-5 w-5" /> : <MessageSquareText className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold">
                    {TEMPLATE_META[r.template].label} · {r.channel === "whatsapp" ? "WhatsApp" : "SMS"}
                  </p>
                  <p className="text-sm text-ink-muted">{formatDateTime(r.sent_at, profile.timezone)}</p>
                </div>
                <span className="tabular text-[15px] font-semibold">{formatMoney(r.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
