"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { PasswordInput } from "@/components/PasswordInput";
import { createClient } from "@/lib/supabase/client";
import { friendlyError, hasErrors, validateEmail, validatePassword, validateRequired } from "@/lib/validation";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = {
      name: validateRequired(name, "Escribe tu nombre."),
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(errs);
    if (hasErrors(errs)) return;

    setLoading(true);
    setFormError("");
    const { data, error } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/bienvenida`,
      },
    });
    if (error) {
      setFormError(friendlyError(error));
      setLoading(false);
      return;
    }
    // Supabase no devuelve error si el correo ya existe y la confirmación está activa
    if (data.user && data.user.identities?.length === 0) {
      setFormError("Ya existe una cuenta con este correo. Inicia sesión.");
      setLoading(false);
      return;
    }
    if (data.session) {
      router.replace("/bienvenida");
      router.refresh();
      return;
    }
    setSentTo(email.trim());
    setLoading(false);
  }

  if (sentTo) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-light text-brand">
          <MailCheck className="h-8 w-8" />
        </div>
        <p className="text-lg font-bold">Revisa tu correo</p>
        <p className="mt-2 text-ink-soft">
          Te enviamos un enlace a <strong>{sentTo}</strong>. Tócalo para activar tu cuenta.
        </p>
        <p className="mt-4 text-sm text-ink-muted">¿No llegó? Revisa la carpeta de spam o promociones.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError && <p className="rounded-xl bg-red-50 px-4 py-3 text-[15px] font-medium text-red-700" role="alert">{formError}</p>}
      <Field label="Tu nombre" htmlFor="name" error={errors.name}>
        <TextInput
          id="name"
          autoComplete="given-name"
          placeholder="Ej: María"
          value={name}
          onChange={(e) => setName(e.target.value)}
          invalid={!!errors.name}
          maxLength={80}
        />
      </Field>
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
      <Field label="Contraseña" htmlFor="password" error={errors.password} hint="Mínimo 8 caracteres.">
        <PasswordInput
          id="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          invalid={!!errors.password}
        />
      </Field>
      <Button type="submit" size="lg" full loading={loading}>
        Empieza gratis
      </Button>
      <p className="text-center text-sm text-ink-muted">
        Al crear tu cuenta aceptas los{" "}
        <Link href="/terminos" className="underline">
          Términos
        </Link>{" "}
        y la{" "}
        <Link href="/privacidad" className="underline">
          Política de Privacidad
        </Link>
        .
      </p>
    </form>
  );
}
