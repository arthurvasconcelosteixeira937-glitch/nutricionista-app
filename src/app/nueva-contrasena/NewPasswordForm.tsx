"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { PasswordInput } from "@/components/PasswordInput";
import { toast } from "@/components/ui/Toaster";
import { createClient } from "@/lib/supabase/client";
import { friendlyError, hasErrors, validatePassword } from "@/lib/validation";

export function NewPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = {
      password: validatePassword(password),
      confirm: confirm !== password ? "Las contraseñas no son iguales." : undefined,
    };
    setErrors(errs);
    if (hasErrors(errs)) return;
    setLoading(true);
    setFormError("");
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setFormError(friendlyError(error));
      setLoading(false);
      return;
    }
    toast("Contraseña actualizada");
    router.replace("/inicio");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError && <p className="rounded-xl bg-red-50 px-4 py-3 text-[15px] font-medium text-red-700" role="alert">{formError}</p>}
      <Field label="Nueva contraseña" htmlFor="password" error={errors.password} hint="Mínimo 8 caracteres.">
        <PasswordInput id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!errors.password} />
      </Field>
      <Field label="Repite la contraseña" htmlFor="confirm" error={errors.confirm}>
        <PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} invalid={!!errors.confirm} />
      </Field>
      <Button type="submit" size="lg" full loading={loading}>
        Guardar contraseña
      </Button>
    </form>
  );
}
