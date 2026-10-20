"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Repeat, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/validation";

export function StopRecurringButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function stop() {
    setLoading(true);
    const { error } = await createClient().from("jobs").update({ recurrence: null }).eq("id", jobId);
    setLoading(false);
    setOpen(false);
    if (error) return toast(friendlyError(error), "error");
    toast("Trabajo fijo detenido");
    router.refresh();
  }

  return (
    <>
      <Button variant="ghost" full icon={<Repeat className="h-5 w-5" />} onClick={() => setOpen(true)}>
        Detener trabajo fijo
      </Button>
      <ConfirmSheet
        open={open}
        onClose={() => setOpen(false)}
        title="¿Detener trabajo fijo?"
        text="Ya no se crearán más cobros automáticos para este trabajo. Los cobros que ya existen no cambian."
        confirmLabel="Sí, detener"
        onConfirm={stop}
        loading={loading}
      />
    </>
  );
}

export function DeleteJobButton({ jobId, backTo }: { jobId: string; backTo: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function remove() {
    setLoading(true);
    const { error } = await createClient().from("jobs").delete().eq("id", jobId);
    if (error) {
      setLoading(false);
      return toast(friendlyError(error), "error");
    }
    toast("Trabajo borrado");
    router.replace(backTo);
    router.refresh();
  }

  return (
    <>
      <Button variant="danger" full icon={<Trash2 className="h-5 w-5" />} onClick={() => setOpen(true)}>
        Borrar trabajo
      </Button>
      <ConfirmSheet
        open={open}
        onClose={() => setOpen(false)}
        title="¿Borrar este trabajo?"
        text="Se borrarán también sus pagos. Esto no se puede deshacer."
        confirmLabel="Sí, borrar"
        onConfirm={remove}
        loading={loading}
      />
    </>
  );
}

export function DeletePaymentButton({ paymentId, label }: { paymentId: string; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function remove() {
    setLoading(true);
    const { error } = await createClient().from("payments").delete().eq("id", paymentId);
    setLoading(false);
    setOpen(false);
    if (error) return toast(friendlyError(error), "error");
    toast("Pago borrado");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 items-center justify-center rounded-full text-ink-muted hover:bg-gray-100"
        aria-label={`Borrar pago de ${label}`}
      >
        <X className="h-5 w-5" />
      </button>
      <ConfirmSheet
        open={open}
        onClose={() => setOpen(false)}
        title="¿Borrar este pago?"
        text={`El pago de ${label} se quitará y el trabajo volverá a quedar pendiente por ese monto.`}
        confirmLabel="Sí, borrar pago"
        onConfirm={remove}
        loading={loading}
      />
    </>
  );
}
