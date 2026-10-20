"use client";

import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { friendlyError, validateEmail } from "@/lib/validation";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateEmail(email);
    setError(err);
    if (err) return;
    setLoading(true);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/nueva-contrasena`,
    });
    setLoading(false);
    if (error && error.code !== "user_not_found") {
      setError(friendlyError(error));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-light text-brand">
          <MailCheck className="h-8 w-8" />
        </div>
        <p className="text-lg font-bold">Revisa tu correo</p>
        <p className="mt-2 text-ink-soft">
          Si existe una cuenta con <strong>{email.trim()}</strong>, te llegará un enlace para crear una nueva contraseña.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Correo" htmlFor="email" error={error}>
        <TextInput
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="tucorreo@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          invalid={!!error}
        />
      </Field>
      <Button type="submit" size="lg" full loading={loading}>
        Enviar enlace
      </Button>
    </form>
  );
}
