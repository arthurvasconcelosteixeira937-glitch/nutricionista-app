"use client";

import { Field, TextInput } from "@/components/ui/Field";
import { Toggle } from "@/components/ui/Toggle";
import {
  normalizeCashtag,
  normalizeVenmo,
  validateCashtag,
  validateVenmo,
  validateZelle,
  type Errors,
} from "@/lib/validation";

export interface PaymentValues {
  zelle: string;
  venmo: string;
  cashapp: string;
  accepts_cash: boolean;
}

export type PaymentErrors = Errors<"zelle" | "venmo" | "cashapp">;

export function validatePaymentValues(v: PaymentValues): PaymentErrors {
  return { zelle: validateZelle(v.zelle), venmo: validateVenmo(v.venmo), cashapp: validateCashtag(v.cashapp) };
}

/** Valores listos para guardar en la base de datos (null si están vacíos). */
export function paymentPayload(v: PaymentValues) {
  return {
    zelle: v.zelle.trim() || null,
    venmo: normalizeVenmo(v.venmo) || null,
    cashapp: normalizeCashtag(v.cashapp) || null,
    accepts_cash: v.accepts_cash,
  };
}

function Prefixed({ prefix, ...rest }: { prefix: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[17px] font-semibold text-ink-muted">{prefix}</span>
      <TextInput {...rest} className="pl-9" />
    </div>
  );
}

export function PaymentFields({
  values,
  errors,
  onChange,
}: {
  values: PaymentValues;
  errors: PaymentErrors;
  onChange: (v: PaymentValues) => void;
}) {
  const set = <K extends keyof PaymentValues>(k: K, val: PaymentValues[K]) => onChange({ ...values, [k]: val });
  return (
    <div className="space-y-4">
      <Field label="Zelle" htmlFor="zelle" optional error={errors.zelle} hint="Correo o teléfono de tu Zelle.">
        <TextInput
          id="zelle"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="correo@email.com o (555) 123-4567"
          value={values.zelle}
          onChange={(e) => set("zelle", e.target.value)}
          invalid={!!errors.zelle}
          maxLength={120}
        />
      </Field>
      <Field label="Venmo" htmlFor="venmo" optional error={errors.venmo}>
        <Prefixed
          prefix="@"
          id="venmo"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="tu-usuario"
          value={values.venmo.replace(/^@+/, "")}
          onChange={(e) => set("venmo", e.target.value)}
          invalid={!!errors.venmo}
          maxLength={31}
        />
      </Field>
      <Field label="Cash App" htmlFor="cashapp" optional error={errors.cashapp}>
        <Prefixed
          prefix="$"
          id="cashapp"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="tucashtag"
          value={values.cashapp.replace(/^\$+/, "")}
          onChange={(e) => set("cashapp", e.target.value)}
          invalid={!!errors.cashapp}
          maxLength={21}
        />
      </Field>
      <Toggle
        checked={values.accepts_cash}
        onChange={(v) => set("accepts_cash", v)}
        label="Efectivo"
        description="También acepto pagos en efectivo"
      />
    </div>
  );
}
