"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { PasswordInput } from "@/components/PasswordInput";
import { createClient } from "@/lib/supabase/client";
import { friendlyError, hasErrors, validateEmail } from "@/lib/validation";

export function LoginForm({ next, linkError }: { next: string; linkError: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState(linkError ? "El enlace venció o ya se usó. Intenta de nuevo." : "");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = { email: validateEmail(email), password: password ? undefined : "Escribe tu contraseña." };
    setErrors(errs);
    if (hasErrors(errs)) return;

    setLoading(true);
    setFormError("");
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setFormError(friendlyError(error));
      setLoading(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError && <p className="rounded-xl bg-red-50 px-4 py-3 text-[15px] font-medium text-red-700" role="alert">{formError}</p>}
      <Field label="Correo" htmlFor="email" error={errors.email}>
        <TextInput
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="tucorreo@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          invalid={!!errors.email}
        />
      </Field>
      <Field label="Contraseña" htmlFor="password" error={errors.password}>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          invalid={!!errors.password}
        />
      </Field>
      <div className="text-right">
        <Link href="/olvide-contrasena" className="inline-flex min-h-[44px] items-center font-semibold text-brand">
          Olvidé mi contraseña
        </Link>
      </div>
      <Button type="submit" size="lg" full loading={loading}>
        Entrar
      </Button>
    </form>
  );
}
