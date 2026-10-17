"use client";
import { useActionState } from "react";
import { createCobroAction } from "@/app/actions/cobros";
import { Alert, Field, buttonClass } from "./ui";

export function NewCobroForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(createCobroAction, undefined);
  const fe = state?.fieldErrors ?? {};
  const v = state?.values ?? {};
  return (
    <form action={action} className="space-y-4">
      <Field
        label="Nombre del cliente"
        name="customer_name"
        defaultValue={v.customer_name}
        placeholder="Ej. Ana López"
        maxLength={80}
        error={fe.customer_name}
        required
      />
      <Field
        label="WhatsApp del cliente"
        name="customer_phone"
        defaultValue={v.customer_phone}
        type="tel"
        inputMode="tel"
        placeholder="55 1234 5678"
        hint="10 dígitos de México"
        error={fe.customer_phone}
        required
      />
      <Field
        label="Monto (MXN)"
        name="amount"
        defaultValue={v.amount}
        inputMode="decimal"
        placeholder="1,250.00"
        error={fe.amount}
        required
      />
      <Field
        label="¿Qué estás cobrando?"
        name="description"
        defaultValue={v.description}
        placeholder="Ej. 2 blusas talla M"
        maxLength={200}
        error={fe.description}
        required
      />
      <Field
        label="Vence (opcional)"
        name="due_date"
        defaultValue={v.due_date}
        type="date"
        min={today}
        hint="Después de esta fecha el link de pago deja de funcionar."
        error={fe.due_date}
      />
      <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm">
        <input type="checkbox" name="reminders_enabled" defaultChecked className="mt-0.5 h-5 w-5 accent-brand-700" />
        <span>
          <b className="block text-ink">Enviar recordatorios si no paga</b>
          Máximo 2, solo entre 9:00 y 20:00.
        </span>
      </label>
      {state?.error ? <Alert kind="error">{state.error}</Alert> : null}
      <button className={buttonClass("primary", "w-full text-lg")} disabled={pending}>
        {pending ? "Creando link de pago…" : "Crear cobro"}
      </button>
    </form>
  );
}
