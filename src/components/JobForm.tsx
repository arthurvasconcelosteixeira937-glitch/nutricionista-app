"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Chips } from "@/components/ui/Chips";
import { Field, MoneyInput, TextInput } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { Toggle } from "@/components/ui/Toggle";
import { toast } from "@/components/ui/Toaster";
import { ClientForm } from "@/components/ClientForm";
import { cn } from "@/lib/cn";
import { RECURRENCES, SERVICE_SUGGESTIONS } from "@/lib/constants";
import { addDays, formatMoney, formatPhone, initials, toCents } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Client, Job, Recurrence, ServiceType } from "@/lib/types";
import { friendlyError, hasErrors, parseAmount, validateAmount, validateDate, validateRequired } from "@/lib/validation";

type FormErrors = { client?: string; description?: string; amount?: string; service?: string; due?: string };

const DUE_PRESETS = [
  { days: 0, label: "Mismo día" },
  { days: 7, label: "En 7 días" },
  { days: 15, label: "En 15 días" },
];

function ClientPicker({
  clients,
  value,
  onChange,
  onCreated,
  invalid,
}: {
  clients: Client[];
  value: Client | null;
  onChange: (c: Client) => void;
  onCreated: (c: Client) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? clients.filter((c) => c.name.toLowerCase().includes(t)) : clients;
  }, [q, clients]);

  const close = () => {
    setOpen(false);
    setCreating(false);
    setQ("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setCreating(clients.length === 0);
          setOpen(true);
        }}
        className={cn(
          "flex min-h-[60px] w-full items-center gap-3 rounded-xl border-2 bg-white px-4 text-left transition",
          invalid ? "border-red-400" : "border-gray-200 hover:border-gray-300"
        )}
        aria-haspopup="dialog"
      >
        {value ? (
          <>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light text-sm font-bold text-brand">
              {initials(value.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[17px] font-semibold">{value.name}</span>
              <span className="block text-sm text-ink-muted">{formatPhone(value.phone)}</span>
            </span>
          </>
        ) : (
          <span className="flex-1 text-[17px] text-gray-400">Elegir cliente</span>
        )}
        <ChevronDown className="h-5 w-5 text-ink-muted" />
      </button>

      <Sheet open={open} onClose={close} title={creating ? "Nuevo cliente" : "Elegir cliente"}>
        {creating ? (
          <>
            <ClientForm
              compact
              onSaved={(c) => {
                onCreated(c);
                close();
              }}
            />
            {clients.length > 0 && (
              <Button variant="ghost" full className="mt-2" onClick={() => setCreating(false)}>
                Elegir de mi lista
              </Button>
            )}
          </>
        ) : (
          <>
            <Button variant="secondary" full icon={<UserPlus className="h-5 w-5" />} onClick={() => setCreating(true)}>
              Crear cliente nuevo
            </Button>
            {clients.length > 6 && (
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por nombre"
                  aria-label="Buscar cliente"
                  className="block min-h-[52px] w-full rounded-xl border-2 border-gray-200 pl-12 pr-4 text-[17px] focus:border-brand focus:outline-none"
                />
              </div>
            )}
            <ul className="mt-3 divide-y divide-gray-100">
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(c);
                      close();
                    }}
                    className={cn(
                      "flex min-h-[64px] w-full items-center gap-3 rounded-xl px-2 text-left active:bg-gray-50",
                      value?.id === c.id && "bg-brand-50"
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light text-sm font-bold text-brand">
                      {initials(c.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[17px] font-semibold">{c.name}</span>
                      <span className="block text-sm text-ink-muted">{formatPhone(c.phone)}</span>
                    </span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && <li className="py-6 text-center text-ink-muted">No encontramos a “{q}”.</li>}
            </ul>
          </>
        )}
      </Sheet>
    </>
  );
}

export function JobForm({
  clients: initialClients,
  initialClientId,
  job,
  serviceType,
  today,
}: {
  clients: Client[];
  initialClientId?: string;
  job?: Job;
  serviceType: ServiceType | null;
  today: string;
}) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [client, setClient] = useState<Client | null>(
    () => initialClients.find((c) => c.id === (job?.client_id ?? initialClientId)) ?? null
  );
  const [description, setDescription] = useState(job?.description ?? "");
  const [amount, setAmount] = useState(job ? Number(job.amount).toFixed(2) : "");
  const [serviceDate, setServiceDate] = useState(job?.service_date ?? today);
  const [dueDate, setDueDate] = useState(job?.due_date ?? today);
  const [dueTouched, setDueTouched] = useState(Boolean(job && job.due_date !== job.service_date));
  const [recurring, setRecurring] = useState(Boolean(job?.recurrence));
  const [recurrence, setRecurrence] = useState<Recurrence>(job?.recurrence ?? "weekly");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const suggestions = serviceType ? SERVICE_SUGGESTIONS[serviceType] : [];

  function onServiceDate(v: string) {
    setServiceDate(v);
    if (!dueTouched || (v && dueDate < v)) setDueDate(v);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: FormErrors = {
      client: client ? undefined : "Elige o crea un cliente.",
      description: validateRequired(description, "Escribe qué trabajo hiciste.", 120),
      amount: validateAmount(amount),
      service: validateDate(serviceDate, "Elige la fecha del servicio."),
      due: validateDate(dueDate, "Elige la fecha de pago."),
    };
    if (!errs.service && !errs.due && dueDate < serviceDate) errs.due = "La fecha de pago no puede ser antes del servicio.";
    if (!errs.amount && job && toCents(parseAmount(amount)) < toCents(job.amount_paid))
      errs.amount = `Ya te pagaron ${formatMoney(job.amount_paid)}. El monto no puede ser menor.`;
    setErrors(errs);
    if (hasErrors(errs)) return;

    setLoading(true);
    setFormError("");
    const payload = {
      client_id: client!.id,
      description: description.trim(),
      amount: parseAmount(amount),
      service_date: serviceDate,
      due_date: dueDate,
      recurrence: recurring ? recurrence : null,
    };
    const supabase = createClient();
    const res = job
      ? await supabase.from("jobs").update(payload).eq("id", job.id).select("id").single()
      : await supabase.from("jobs").insert(payload).select("id").single();

    if (res.error) {
      setFormError(friendlyError(res.error));
      setLoading(false);
      return;
    }
    toast(job ? "Trabajo actualizado" : "Trabajo guardado");
    router.replace(job ? `/trabajos/${job.id}` : initialClientId ? `/clientes/${initialClientId}` : "/inicio");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {formError && <p className="rounded-xl bg-red-50 px-4 py-3 text-[15px] font-medium text-red-700" role="alert">{formError}</p>}

      <Field label="Cliente" error={errors.client}>
        <ClientPicker
          clients={clients}
          value={client}
          onChange={setClient}
          onCreated={(c) => {
            setClients((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
            setClient(c);
          }}
          invalid={!!errors.client}
        />
      </Field>

      <Field label="¿Qué trabajo hiciste?" htmlFor="description" error={errors.description}>
        <TextInput
          id="description"
          placeholder="Ej: Limpieza de casa"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          invalid={!!errors.description}
          maxLength={120}
          autoCapitalize="sentences"
        />
        {suggestions.length > 0 && !description && (
          <div className="flex flex-wrap gap-2 pt-1">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setDescription(s)}
                className="min-h-[40px] rounded-full bg-gray-100 px-3.5 text-[14px] font-medium text-ink-soft active:bg-gray-200"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </Field>

      <Field label="¿Cuánto cobras?" htmlFor="amount" error={errors.amount}>
        <MoneyInput id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} invalid={!!errors.amount} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha del trabajo" htmlFor="service-date" error={errors.service}>
          <TextInput
            id="service-date"
            type="date"
            value={serviceDate}
            onChange={(e) => onServiceDate(e.target.value)}
            invalid={!!errors.service}
            className="!px-3"
          />
        </Field>
        <Field label="Vence el" htmlFor="due-date" error={errors.due}>
          <TextInput
            id="due-date"
            type="date"
            value={dueDate}
            min={serviceDate}
            onChange={(e) => {
              setDueTouched(true);
              setDueDate(e.target.value);
            }}
            invalid={!!errors.due}
            className="!px-3"
          />
        </Field>
      </div>
      <div className="-mt-3 flex flex-wrap gap-2">
        {DUE_PRESETS.map((p) => {
          const value = serviceDate ? addDays(serviceDate, p.days) : "";
          const active = value === dueDate;
          return (
            <button
              key={p.days}
              type="button"
              disabled={!serviceDate}
              onClick={() => {
                setDueTouched(p.days !== 0);
                setDueDate(value);
              }}
              className={cn(
                "min-h-[40px] rounded-full px-3.5 text-[14px] font-semibold transition",
                active ? "bg-brand text-white" : "bg-gray-100 text-ink-soft"
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        <Toggle
          checked={recurring}
          onChange={setRecurring}
          label="Trabajo fijo"
          description="Se repite y te recordamos cobrarlo"
        />
        {recurring && (
          <div className="rounded-xl bg-brand-50 p-3">
            <Chips options={RECURRENCES} value={recurrence} onChange={setRecurrence} columns={3} ariaLabel="Frecuencia" />
            <p className="mt-2 text-sm text-ink-soft">Crearemos el próximo cobro automáticamente en la fecha que toca.</p>
          </div>
        )}
      </div>

      <Button type="submit" size="lg" full loading={loading}>
        {job ? "Guardar cambios" : "Guardar trabajo"}
      </Button>
    </form>
  );
}
