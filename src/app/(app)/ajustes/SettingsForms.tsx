"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Chips } from "@/components/ui/Chips";
import { Field, TextInput } from "@/components/ui/Field";
import { toast } from "@/components/ui/Toaster";
import { PaymentFields, paymentPayload, validatePaymentValues, type PaymentErrors, type PaymentValues } from "@/components/PaymentFields";
import { SERVICE_TYPES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ServiceType } from "@/lib/types";
import { friendlyError, hasErrors, validateRequired } from "@/lib/validation";

async function saveProfile(id: string, values: Record<string, unknown>) {
  const { error } = await createClient().from("profiles").update(values).eq("id", id);
  if (error) {
    toast(friendlyError(error), "error");
    return false;
  }
  toast("Cambios guardados");
  return true;
}

export function BusinessForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [name, setName] = useState(profile.full_name);
  const [business, setBusiness] = useState(profile.business_name);
  const [service, setService] = useState<ServiceType | null>(profile.service_type);
  const [errors, setErrors] = useState<{ name?: string; business?: string }>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = {
      name: validateRequired(name, "Escribe tu nombre."),
      business: validateRequired(business, "Escribe el nombre de tu negocio."),
    };
    setErrors(errs);
    if (hasErrors(errs)) return;
    setLoading(true);
    const ok = await saveProfile(profile.id, { full_name: name.trim(), business_name: business.trim(), service_type: service });
    setLoading(false);
    if (ok) router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Tu nombre" htmlFor="full-name" error={errors.name}>
        <TextInput id="full-name" value={name} onChange={(e) => setName(e.target.value)} invalid={!!errors.name} maxLength={80} />
      </Field>
      <Field label="Nombre del negocio" htmlFor="business-name" error={errors.business}>
        <TextInput id="business-name" value={business} onChange={(e) => setBusiness(e.target.value)} invalid={!!errors.business} maxLength={80} />
      </Field>
      <Field label="Tipo de servicio">
        <Chips options={SERVICE_TYPES} value={service} onChange={setService} ariaLabel="Tipo de servicio" />
      </Field>
      <Button type="submit" full loading={loading}>
        Guardar
      </Button>
    </form>
  );
}

export function PaymentForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [values, setValues] = useState<PaymentValues>({
    zelle: profile.zelle ?? "",
    venmo: profile.venmo ?? "",
    cashapp: profile.cashapp ?? "",
    accepts_cash: profile.accepts_cash,
  });
  const [errors, setErrors] = useState<PaymentErrors>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validatePaymentValues(values);
    setErrors(errs);
    if (hasErrors(errs)) return;
    setLoading(true);
    const ok = await saveProfile(profile.id, paymentPayload(values));
    setLoading(false);
    if (ok) router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <PaymentFields values={values} errors={errors} onChange={setValues} />
      <Button type="submit" full loading={loading}>
        Guardar
      </Button>
    </form>
  );
}

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="danger"
      size="lg"
      full
      loading={loading}
      icon={<LogOut className="h-5 w-5" />}
      onClick={async () => {
        setLoading(true);
        await createClient().auth.signOut();
        router.replace("/");
        router.refresh();
      }}
    >
      Cerrar sesión
    </Button>
  );
}
