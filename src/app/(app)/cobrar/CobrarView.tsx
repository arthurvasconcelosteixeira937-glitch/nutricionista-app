"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Info, MessageCircle, MessageSquareText, RotateCcw } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { daysBetween, formatDate, formatMoney, formatPhone } from "@/lib/format";
import { TEMPLATE_META, buildMessage, smsLink, suggestTemplate, whatsappLink, type MessageJob } from "@/lib/messages";
import { createClient } from "@/lib/supabase/client";
import type { Channel, Client, Language, PaymentInfo, TemplateKey } from "@/lib/types";

export interface CobrarJob extends MessageJob {
  id: string;
}

const TEMPLATES: TemplateKey[] = ["amigable", "firme", "ultimo"];

export function CobrarView({
  client,
  jobs,
  timesSent,
  businessName,
  payment,
  today,
  backHref,
}: {
  client: Pick<Client, "id" | "name" | "phone" | "language">;
  jobs: CobrarJob[];
  timesSent: number;
  businessName: string;
  payment: PaymentInfo;
  today: string;
  backHref: string;
}) {
  const router = useRouter();
  const suggested = suggestTemplate(timesSent);
  const [template, setTemplate] = useState<TemplateKey>(suggested);
  const [language, setLanguage] = useState<Language>(client.language);
  const [text, setText] = useState(() =>
    buildMessage({ template: suggested, language: client.language, clientName: client.name, businessName, jobs, today, payment })
  );
  const [edited, setEdited] = useState(false);
  const [sent, setSent] = useState<Channel | null>(null);
  const [error, setError] = useState("");

  const total = jobs.reduce((acc, j) => acc + Math.round(j.balance * 100), 0) / 100;
  const maxLate = Math.max(0, ...jobs.map((j) => daysBetween(j.due_date, today)));
  const hasPaymentInfo = Boolean(payment.zelle || payment.venmo || payment.cashapp || payment.accepts_cash);

  function choose(t: TemplateKey, lang: Language = language) {
    setTemplate(t);
    setLanguage(lang);
    setText(buildMessage({ template: t, language: lang, clientName: client.name, businessName, jobs, today, payment }));
    setEdited(false);
  }

  function onSend(channel: Channel, e: React.MouseEvent) {
    if (!text.trim()) {
      e.preventDefault();
      setError("El mensaje está vacío.");
      return;
    }
    setError("");
    // Se registra en segundo plano; el enlace abre WhatsApp/SMS de inmediato
    createClient()
      .from("reminders_sent")
      .insert({
        client_id: client.id,
        job_ids: jobs.map((j) => j.id),
        channel,
        template,
        language,
        message: text.slice(0, 4000),
        amount: total,
      })
      .then(({ error }) => {
        if (error) console.error("No se pudo registrar el cobro", error);
      });
    setTimeout(() => setSent(channel), 600);
  }

  return (
    <>
      <Card className="p-5">
        <p className="text-[15px] text-ink-muted">Cobrar a</p>
        <p className="text-xl font-bold">{client.name}</p>
        <p className="text-[15px] text-ink-muted">{formatPhone(client.phone)}</p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <p className="tabular text-[34px] font-extrabold leading-none">{formatMoney(total)}</p>
          {maxLate > 0 && (
            <span className="rounded-full bg-alert-light px-2.5 py-1 text-[13px] font-semibold text-alert-dark">
              {maxLate} {maxLate === 1 ? "día" : "días"} de atraso
            </span>
          )}
        </div>
        {jobs.length > 1 && (
          <ul className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-[15px] text-ink-soft">
            {jobs.map((j) => (
              <li key={j.id} className="flex justify-between gap-3">
                <span className="truncate">
                  {j.description} · {formatDate(j.service_date)}
                </span>
                <span className="tabular font-semibold">{formatMoney(j.balance)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <section className="mt-6">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Elige el mensaje</h2>
          <p className="text-sm text-ink-muted">
            {timesSent === 0 ? "Nunca le has cobrado" : `Le cobraste ${timesSent} ${timesSent === 1 ? "vez" : "veces"}`}
          </p>
        </div>
        <div role="radiogroup" aria-label="Tipo de mensaje" className="grid grid-cols-3 gap-2">
          {TEMPLATES.map((t) => {
            const active = t === template;
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => choose(t)}
                className={cn(
                  "relative flex min-h-[64px] flex-col items-center justify-center rounded-xl border-2 px-2 text-center transition",
                  active
                    ? t === "ultimo"
                      ? "border-alert bg-alert-light text-alert-dark"
                      : "border-brand bg-brand-light text-brand"
                    : "border-gray-200 bg-white text-ink"
                )}
              >
                <span className="text-[15px] font-bold leading-tight">{TEMPLATE_META[t].label}</span>
                {t === suggested && <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide opacity-80">Sugerido</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-[15px] font-semibold">Idioma</span>
          <div className="flex rounded-xl bg-gray-100 p-1" role="radiogroup" aria-label="Idioma del mensaje">
            {(["es", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={language === l}
                onClick={() => choose(template, l)}
                className={cn(
                  "min-h-[40px] rounded-lg px-4 text-[15px] font-semibold transition",
                  language === l ? "bg-white text-brand shadow-sm" : "text-ink-muted"
                )}
              >
                {l === "es" ? "Español" : "English"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="message" className="text-[15px] font-semibold">
              Mensaje <span className="font-normal text-ink-muted">(puedes editarlo)</span>
            </label>
            {edited && (
              <button
                type="button"
                onClick={() => choose(template)}
                className="inline-flex min-h-[40px] items-center gap-1 text-sm font-semibold text-brand"
              >
                <RotateCcw className="h-4 w-4" /> Restaurar
              </button>
            )}
          </div>
          <textarea
            id="message"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setEdited(true);
            }}
            rows={11}
            maxLength={4000}
            className="block w-full rounded-2xl border-2 border-gray-200 bg-[#F0FAF4] p-4 text-[16px] leading-relaxed text-ink focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
          />
          {error && <p className="mt-1 text-sm font-medium text-red-600">{error}</p>}
        </div>

        {!hasPaymentInfo && (
          <Link href="/ajustes" className="mt-3 flex gap-2 rounded-xl bg-amber-50 px-4 py-3 text-[15px] text-amber-900">
            <Info className="mt-0.5 h-5 w-5 shrink-0" />
            <span>
              Agrega tu Zelle, Venmo o Cash App en <strong className="underline">Ajustes</strong> para que salgan en el mensaje.
            </span>
          </Link>
        )}
      </section>

      <div className="mt-6 space-y-3">
        <a
          href={whatsappLink(client.phone, text)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => onSend("whatsapp", e)}
          className="flex min-h-[60px] w-full items-center justify-center gap-2 rounded-2xl bg-[#1FA855] px-5 text-lg font-bold text-white shadow-sm active:scale-[.98]"
        >
          <MessageCircle className="h-6 w-6" /> Enviar por WhatsApp
        </a>
        <a
          href={smsLink(client.phone, text)}
          onClick={(e) => onSend("sms", e)}
          className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-brand/20 bg-white px-5 text-lg font-bold text-brand active:scale-[.98]"
        >
          <MessageSquareText className="h-6 w-6" /> Enviar por SMS
        </a>
      </div>

      <Sheet open={sent !== null} onClose={() => setSent(null)} title="Cobro registrado">
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="h-14 w-14 text-brand" />
          <p className="mt-3 text-lg font-bold">¡Listo! Guardamos este cobro.</p>
          <p className="mt-1 text-ink-soft">
            Enviado por {sent === "whatsapp" ? "WhatsApp" : "SMS"}. Cuando te pague, márcalo como pagado.
          </p>
        </div>
        <div className="mt-6 space-y-2">
          {jobs.length === 1 && (
            <LinkButton href={`/trabajos/${jobs[0].id}`} size="lg" full>
              Ya me pagó
            </LinkButton>
          )}
          <Button
            variant={jobs.length === 1 ? "outline" : "primary"}
            size="lg"
            full
            onClick={() => {
              router.push(backHref);
              router.refresh();
            }}
          >
            Volver
          </Button>
        </div>
      </Sheet>
    </>
  );
}
