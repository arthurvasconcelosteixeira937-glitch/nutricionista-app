"use client";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";
import { saveBusinessAction, saveWhatsappAction, updateSettingsAction } from "@/app/actions/seller";
import { Alert, Field, buttonClass } from "./ui";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <Alert kind="error">{state.error}</Alert>;
  if (state?.ok) return <Alert kind="success">{state.ok}</Alert>;
  return null;
}

export function BusinessForm({ defaultValue }: { defaultValue?: string | null }) {
  const [state, action, pending] = useActionState(saveBusinessAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field
        label="Nombre de tu negocio"
        name="business_name"
        defaultValue={defaultValue ?? ""}
        placeholder="Ej. Tienda Luna"
        hint="Así lo verán tus clientes en el cobro."
        maxLength={60}
        required
        autoFocus
      />
      <Feedback state={state} />
      <button className={buttonClass("primary", "w-full")} disabled={pending}>
        {pending ? "Guardando…" : "Continuar"}
      </button>
    </form>
  );
}

export function WhatsappForm({ defaultValue }: { defaultValue?: string | null }) {
  const [state, action, pending] = useActionState(saveWhatsappAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field
        label="Tu WhatsApp"
        name="whatsapp"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        defaultValue={defaultValue?.replace("+52", "") ?? ""}
        placeholder="55 1234 5678"
        hint="10 dígitos. Aquí te avisamos cuando te paguen."
        required
        autoFocus
      />
      <Feedback state={state} />
      <button className={buttonClass("primary", "w-full")} disabled={pending}>
        {pending ? "Guardando…" : "Terminar"}
      </button>
    </form>
  );
}

export function SettingsForm({
  businessName,
  whatsapp,
  remindersEnabled,
}: {
  businessName: string;
  whatsapp: string;
  remindersEnabled: boolean;
}) {
  const [state, action, pending] = useActionState(updateSettingsAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Nombre de tu negocio" name="business_name" defaultValue={businessName} maxLength={60} required />
      <Field
        label="Tu WhatsApp"
        name="whatsapp"
        type="tel"
        inputMode="tel"
        defaultValue={whatsapp.replace("+52", "")}
        hint="10 dígitos de México"
        required
      />
      <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm">
        <input
          type="checkbox"
          name="reminders_enabled"
          defaultChecked={remindersEnabled}
          className="mt-0.5 h-5 w-5 rounded border-slate-300 accent-brand-700"
        />
        <span>
          <b className="block text-ink">Recordatorios automáticos</b>
          Máximo 2 por cobro, solo entre 9:00 y 20:00 (hora del centro de México).
        </span>
      </label>
      <Feedback state={state} />
      <button className={buttonClass("primary", "w-full sm:w-auto")} disabled={pending}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
