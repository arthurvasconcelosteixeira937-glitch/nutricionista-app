"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleDollarSign } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Chips } from "@/components/ui/Chips";
import { Field, MoneyInput, TextInput } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { toast } from "@/components/ui/Toaster";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatMoney, toCents } from "@/lib/format";
import { remaining } from "@/lib/jobs";
import { createClient } from "@/lib/supabase/client";
import type { Job, PaymentMethod } from "@/lib/types";
import { friendlyError, hasErrors, parseAmount, validateAmount, validateDate } from "@/lib/validation";

export function PaymentButton({
  job,
  today,
  variant = "secondary",
}: {
  job: Pick<Job, "id" | "amount" | "amount_paid">;
  today: string;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const balance = remaining(job);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(balance.toFixed(2));
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [date, setDate] = useState(today);
  const [errors, setErrors] = useState<{ amount?: string; method?: string; date?: string }>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const value = parseAmount(amount);
  const partial = !Number.isNaN(value) && value > 0 && toCents(value) < toCents(balance);

  function openSheet() {
    setAmount(balance.toFixed(2));
    setMethod(null);
    setDate(today);
    setErrors({});
    setFormError("");
    setOpen(true);
  }

  async function save() {
    const errs = {
      amount: validateAmount(amount, balance),
      method: method ? undefined : "Elige cómo te pagaron.",
      date: validateDate(date, "Elige la fecha del pago."),
    };
    setErrors(errs);
    if (hasErrors(errs)) return;
    setLoading(true);
    setFormError("");
    const { error } = await createClient()
      .from("payments")
      .insert({ job_id: job.id, amount: value, method, paid_on: date });
    setLoading(false);
    if (error) {
      setFormError(friendlyError(error));
      return;
    }
    setOpen(false);
    toast(partial ? `Pago de ${formatMoney(value)} guardado` : "¡Pagado! Ya puedes enviar el recibo.");
    router.refresh();
  }

  return (
    <>
      <Button variant={variant} size="lg" full icon={<CircleDollarSign className="h-6 w-6" />} onClick={openSheet}>
        Marcar como pagado
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Registrar pago">
        <div className="space-y-5">
          {formError && <p className="rounded-xl bg-red-50 px-4 py-3 text-[15px] font-medium text-red-700" role="alert">{formError}</p>}
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-[15px]">
            Falta por cobrar: <strong className="tabular">{formatMoney(balance)}</strong>
          </div>
          <Field
            label="¿Cuánto te pagaron?"
            htmlFor="pay-amount"
            error={errors.amount}
            hint={partial ? `Pago parcial. Quedará pendiente ${formatMoney((toCents(balance) - toCents(value)) / 100)}.` : "Pago completo."}
          >
            <MoneyInput id="pay-amount" value={amount} onChange={(e) => setAmount(e.target.value)} invalid={!!errors.amount} />
          </Field>
          <Field label="¿Cómo te pagaron?" error={errors.method}>
            <Chips options={PAYMENT_METHODS} value={method} onChange={setMethod} columns={3} ariaLabel="Método de pago" />
          </Field>
          <Field label="Fecha del pago" htmlFor="pay-date" error={errors.date}>
            <TextInput id="pay-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} invalid={!!errors.date} />
          </Field>
          <Button size="lg" full onClick={save} loading={loading}>
            Guardar pago
          </Button>
        </div>
      </Sheet>
    </>
  );
}
