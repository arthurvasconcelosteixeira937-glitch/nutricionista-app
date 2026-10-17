"use client";
import { useState, useTransition } from "react";
import {
  cancelCobroAction,
  checkCobroAction,
  sendCobroAction,
  sendReceiptAction,
  sendReminderAction,
  toggleCobroRemindersAction,
  type MessageActionResult,
} from "@/app/actions/cobros";
import { Alert, WhatsAppIcon, buttonClass, type ButtonVariant } from "./ui";

function useAction() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<MessageActionResult | null>(null);
  const run = (fn: () => Promise<MessageActionResult>) =>
    start(async () => {
      const r = await fn();
      setResult(r);
      // Modo manual: abre o WhatsApp com a mensagem pronta.
      if (r.waLink) window.location.href = r.waLink;
    });
  return { pending, result, run };
}

function ActionButton({
  label,
  pendingLabel,
  variant = "secondary",
  onClick,
  icon,
  className = "",
}: {
  label: string;
  pendingLabel: string;
  variant?: ButtonVariant;
  onClick: (run: ReturnType<typeof useAction>["run"]) => void;
  icon?: React.ReactNode;
  className?: string;
}) {
  const a = useAction();
  return (
    <div className="space-y-2">
      <button type="button" className={buttonClass(variant, `w-full ${className}`)} disabled={a.pending} onClick={() => onClick(a.run)}>
        {icon}
        {a.pending ? pendingLabel : label}
      </button>
      {a.result ? <Alert kind={a.result.ok ? "success" : "error"}>{a.result.message}</Alert> : null}
    </div>
  );
}

export function SendCobroButton({ cobroId, label = "Enviar por WhatsApp" }: { cobroId: string; label?: string }) {
  return (
    <ActionButton
      label={label}
      pendingLabel="Preparando…"
      variant="whatsapp"
      icon={<WhatsAppIcon />}
      onClick={(run) => run(() => sendCobroAction(cobroId))}
    />
  );
}

export function ReminderButton({ cobroId, remaining }: { cobroId: string; remaining: number }) {
  return (
    <ActionButton
      label={`Enviar recordatorio (${remaining} disponible${remaining === 1 ? "" : "s"})`}
      pendingLabel="Preparando…"
      onClick={(run) => run(() => sendReminderAction(cobroId))}
    />
  );
}

export function ReceiptButton({ cobroId }: { cobroId: string }) {
  return (
    <ActionButton
      label="Enviar recibo al cliente"
      pendingLabel="Preparando…"
      variant="whatsapp"
      icon={<WhatsAppIcon />}
      onClick={(run) => run(() => sendReceiptAction(cobroId))}
    />
  );
}

export function CheckButton({ cobroId }: { cobroId: string }) {
  return (
    <ActionButton
      label="Consultar a Mercado Pago ahora"
      pendingLabel="Consultando…"
      onClick={(run) => run(() => checkCobroAction(cobroId))}
    />
  );
}

export function CancelButton({ cobroId }: { cobroId: string }) {
  return (
    <ActionButton
      label="Cancelar cobro"
      pendingLabel="Cancelando…"
      variant="danger"
      onClick={(run) => {
        if (confirm("¿Seguro que quieres cancelar este cobro? El link de pago dejará de funcionar.")) {
          run(() => cancelCobroAction(cobroId));
        }
      }}
    />
  );
}

export function RemindersToggle({ cobroId, enabled }: { cobroId: string; enabled: boolean }) {
  const [pending, start] = useTransition();
  const [on, setOn] = useState(enabled);
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4 text-sm">
      <span>
        <b className="block text-ink">Recordatorios automáticos</b>
        Máximo 2, entre 9:00 y 20:00.
      </span>
      <input
        type="checkbox"
        className="h-6 w-6 accent-brand-700"
        checked={on}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          setOn(next);
          start(async () => {
            const r = await toggleCobroRemindersAction(cobroId, next);
            if (!r.ok) setOn(!next);
          });
        }}
      />
    </label>
  );
}

export function CopyButton({ text, label = "Copiar link" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={buttonClass("secondary", "w-full")}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          prompt("Copia el link:", text);
        }
      }}
    >
      {copied ? "¡Copiado!" : label}
    </button>
  );
}
