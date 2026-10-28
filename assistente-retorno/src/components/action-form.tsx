"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import type { ActionState } from "@/lib/action-state";
import { initialActionState } from "@/lib/action-state";
import { buttonClasses, cn } from "./ui";

const PendingContext = createContext(false);

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  /** Se informado, a pessoa precisa digitar este texto para confirmar. */
  typeToConfirm?: string;
}

/**
 * Formulário ligado a uma server action, com estado de envio, mensagem de sucesso/erro
 * e confirmação opcional antes de ações importantes. Não reseta os campos em caso de erro.
 */
export function ActionForm({
  action,
  children,
  className,
  confirm,
  resetOnSuccess,
  showSuccess = true,
  onDone,
  id,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  confirm?: ConfirmOptions;
  resetOnSuccess?: boolean;
  showSuccess?: boolean;
  onDone?: (state: ActionState) => void;
  id?: string;
}) {
  const [state, setState] = useState<ActionState>(initialActionState);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pendingData = useRef<FormData | null>(null);
  const [typed, setTyped] = useState("");

  function submit(fd: FormData) {
    startTransition(async () => {
      const result = await action(state, fd);
      setState(result);
      if (result.ok && resetOnSuccess) formRef.current?.reset();
      onDone?.(result);
    });
  }

  return (
    <PendingContext.Provider value={pending}>
      <form
        id={id}
        ref={formRef}
        className={className}
        aria-busy={pending}
        onSubmit={(e) => {
          e.preventDefault();
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          const fd = new FormData(e.currentTarget, submitter);
          if (confirm) {
            pendingData.current = fd;
            setTyped("");
            dialogRef.current?.showModal();
          } else {
            submit(fd);
          }
        }}
      >
        {children}
        <FormFeedback state={state} showSuccess={showSuccess} />
      </form>
      {confirm && (
        <dialog
          ref={dialogRef}
          className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-0 shadow-xl"
          aria-labelledby={`${id ?? "confirm"}-title`}
        >
          <div className="p-5">
            <h2 id={`${id ?? "confirm"}-title`} className="text-base font-semibold text-slate-900">
              {confirm.title}
            </h2>
            {confirm.description && <div className="mt-2 text-sm text-slate-600">{confirm.description}</div>}
            {confirm.typeToConfirm && (
              <label className="mt-4 block text-sm text-slate-700">
                Digite <strong>{confirm.typeToConfirm}</strong> para confirmar:
                <input
                  className="mt-1 block h-10 w-full rounded-lg border border-slate-300 px-3"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoComplete="off"
                />
              </label>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
            <button type="button" className={buttonClasses("secondary")} onClick={() => dialogRef.current?.close()}>
              Cancelar
            </button>
            <button
              type="button"
              className={buttonClasses(confirm.danger ? "danger" : "primary")}
              disabled={!!confirm.typeToConfirm && typed.trim() !== confirm.typeToConfirm}
              onClick={() => {
                dialogRef.current?.close();
                if (pendingData.current) submit(pendingData.current);
              }}
            >
              {confirm.confirmLabel ?? "Confirmar"}
            </button>
          </div>
        </dialog>
      )}
    </PendingContext.Provider>
  );
}

export function FormFeedback({ state, showSuccess = true }: { state: ActionState; showSuccess?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.message && !state.ok) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [state.at, state.message, state.ok]);
  if (!state.message || (state.ok && !showSuccess)) return <div ref={ref} aria-live="polite" />;
  return (
    <div
      ref={ref}
      aria-live="polite"
      role={state.ok ? "status" : "alert"}
      className={cn(
        "mt-3 rounded-lg border px-3 py-2 text-sm",
        state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900",
      )}
    >
      <p>{state.message}</p>
      {state.errors && state.errors.length > 0 && (
        <ul className="mt-1 list-disc pl-5">
          {state.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SubmitButton({
  children,
  pendingLabel = "Salvando…",
  variant = "primary",
  size = "md",
  className,
  name,
  value,
  disabled,
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  className?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
}) {
  const pending = useContext(PendingContext);
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending || disabled}
      className={cn(buttonClasses(variant, size), className)}
    >
      {pending && (
        <span className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />
      )}
      {pending ? pendingLabel : children}
    </button>
  );
}
