"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, PartyPopper, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Chips } from "@/components/ui/Chips";
import { Field, TextInput } from "@/components/ui/Field";
import { Logo } from "@/components/ui/Logo";
import { PaymentFields, paymentPayload, validatePaymentValues, type PaymentErrors, type PaymentValues } from "@/components/PaymentFields";
import { cn } from "@/lib/cn";
import { SERVICE_TYPES, TRIAL_DAYS } from "@/lib/constants";
import { firstName } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ServiceType } from "@/lib/types";
import { friendlyError, hasErrors, validateRequired } from "@/lib/validation";

export function Onboarding({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [business, setBusiness] = useState(profile.business_name);
  const [service, setService] = useState<ServiceType | null>(profile.service_type);
  const [errors1, setErrors1] = useState<{ business?: string; service?: string }>({});
  const [pay, setPay] = useState<PaymentValues>({
    zelle: profile.zelle ?? "",
    venmo: profile.venmo ?? "",
    cashapp: profile.cashapp ?? "",
    accepts_cash: profile.accepts_cash,
  });
  const [errors2, setErrors2] = useState<PaymentErrors>({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  async function save(values: Record<string, unknown>) {
    setLoading(true);
    setFormError("");
    const { error } = await createClient().from("profiles").update(values).eq("id", profile.id);
    setLoading(false);
    if (error) {
      setFormError(friendlyError(error));
      return false;
    }
    return true;
  }

  async function next1() {
    const errs = {
      business: validateRequired(business, "Escribe el nombre de tu negocio."),
      service: service ? undefined : "Elige tu tipo de servicio.",
    };
    setErrors1(errs);
    if (hasErrors(errs)) return;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
    if (await save({ business_name: business.trim(), service_type: service, timezone })) setStep(2);
  }

  async function next2(skip = false) {
    if (!skip) {
      const errs = validatePaymentValues(pay);
      setErrors2(errs);
      if (hasErrors(errs)) return;
    }
    const values = skip ? { onboarded: true } : { ...paymentPayload(pay), onboarded: true };
    if (await save(values)) setStep(3);
  }

  return (
    <main className="flex min-h-dvh flex-col bg-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex h-14 items-center justify-between">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="-ml-2 flex h-12 w-12 items-center justify-center rounded-full hover:bg-gray-100"
              aria-label="Volver"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
          ) : (
            <Logo />
          )}
          <div className="flex gap-1.5" aria-label={`Paso ${step} de 3`}>
            {[1, 2, 3].map((n) => (
              <span key={n} className={cn("h-2.5 rounded-full transition-all", n === step ? "w-8 bg-brand" : n < step ? "w-2.5 bg-brand" : "w-2.5 bg-gray-200")} />
            ))}
          </div>
        </div>

        {formError && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[15px] font-medium text-red-700" role="alert">{formError}</p>}

        {step === 1 && (
          <section className="flex flex-1 flex-col">
            <h1 className="mt-6 text-3xl font-extrabold">
              ¡Bienvenido{profile.full_name ? `, ${firstName(profile.full_name)}` : ""}!
            </h1>
            <p className="mt-2 text-lg text-ink-soft">Cuéntanos de tu negocio.</p>
            <div className="mt-8 space-y-6">
              <Field label="Nombre de tu negocio" htmlFor="business" error={errors1.business} hint="Así lo verán tus clientes en los mensajes.">
                <TextInput
                  id="business"
                  placeholder="Ej: María's Cleaning"
                  value={business}
                  onChange={(e) => setBusiness(e.target.value)}
                  invalid={!!errors1.business}
                  maxLength={80}
                />
              </Field>
              <Field label="¿A qué te dedicas?" error={errors1.service}>
                <Chips options={SERVICE_TYPES} value={service} onChange={setService} ariaLabel="Tipo de servicio" />
              </Field>
            </div>
            <div className="mt-auto pt-8">
              <Button size="lg" full onClick={next1} loading={loading}>
                Siguiente
              </Button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="flex flex-1 flex-col">
            <h1 className="mt-2 text-3xl font-extrabold">¿Cómo te pagan?</h1>
            <p className="mt-2 text-lg text-ink-soft">Lo pondremos en tus mensajes de cobro. Llena solo los que uses.</p>
            <div className="mt-6">
              <PaymentFields values={pay} errors={errors2} onChange={setPay} />
            </div>
            <div className="mt-auto space-y-2 pt-8">
              <Button size="lg" full onClick={() => next2()} loading={loading}>
                Siguiente
              </Button>
              <Button variant="ghost" full onClick={() => next2(true)} disabled={loading}>
                Lo hago después
              </Button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="flex flex-1 flex-col items-center text-center">
            <div className="mt-16 flex h-24 w-24 items-center justify-center rounded-full bg-brand-light text-brand">
              <PartyPopper className="h-12 w-12" />
            </div>
            <h1 className="mt-6 text-3xl font-extrabold">¡Todo listo!</h1>
            <p className="mt-3 max-w-xs text-lg text-ink-soft">
              Tienes {TRIAL_DAYS} días gratis. Anota tu primer trabajo y empieza a cobrar.
            </p>
            <div className="mt-auto w-full space-y-2 pt-8">
              <Button
                size="lg"
                full
                icon={<Plus className="h-6 w-6" />}
                onClick={() => {
                  router.replace("/trabajos/nuevo");
                  router.refresh();
                }}
              >
                Agregar mi primer trabajo
              </Button>
              <Button
                variant="ghost"
                full
                onClick={() => {
                  router.replace("/inicio");
                  router.refresh();
                }}
              >
                Ir al inicio
              </Button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
