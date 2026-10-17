"use client";
import Link from "next/link";
import { useActionState } from "react";
import {
  resetPasswordAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
  type FormState,
} from "@/app/actions/auth";
import { Alert, Field, buttonClass } from "./ui";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <Alert kind="error">{state.error}</Alert>;
  if (state?.ok) return <Alert kind="success">{state.ok}</Alert>;
  return null;
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signInAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Correo" name="email" type="email" autoComplete="email" defaultValue={state?.email} required />
      <Field label="Contraseña" name="password" type="password" autoComplete="current-password" required />
      <Feedback state={state} />
      <button className={buttonClass("primary", "w-full")} disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
      <p className="text-center text-sm">
        <Link href="/recuperar" className="font-medium text-brand-700 hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, undefined);
  if (state?.ok) return <Feedback state={state} />;
  return (
    <form action={action} className="space-y-4">
      <Field label="Correo" name="email" type="email" autoComplete="email" defaultValue={state?.email} required />
      <Field
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        hint="Mínimo 8 caracteres"
        required
      />
      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input type="checkbox" name="accept" className="mt-0.5 h-5 w-5 rounded border-slate-300 accent-brand-700" required />
        <span>
          Acepto los{" "}
          <Link href="/terminos" target="_blank" className="font-medium text-brand-700 underline">
            Términos y Condiciones
          </Link>{" "}
          y el{" "}
          <Link href="/privacidad" target="_blank" className="font-medium text-brand-700 underline">
            Aviso de Privacidad
          </Link>
          .
        </span>
      </label>
      <Feedback state={state} />
      <button className={buttonClass("primary", "w-full")} disabled={pending}>
        {pending ? "Creando cuenta…" : "Crear cuenta gratis"}
      </button>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Correo de tu cuenta" name="email" type="email" autoComplete="email" required />
      <Feedback state={state} />
      <button className={buttonClass("primary", "w-full")} disabled={pending}>
        {pending ? "Enviando…" : "Enviar enlace"}
      </button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Nueva contraseña" name="password" type="password" autoComplete="new-password" minLength={8} required />
      <Field label="Repite la contraseña" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      <Feedback state={state} />
      <button className={buttonClass("primary", "w-full")} disabled={pending}>
        {pending ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
