"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Chips } from "@/components/ui/Chips";
import { Field, TextArea, TextInput } from "@/components/ui/Field";
import { toast } from "@/components/ui/Toaster";
import { maskPhone, toE164 } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { CLIENT_SELECT } from "@/lib/queries";
import type { Client, Language } from "@/lib/types";
import { friendlyError, hasErrors, validatePhone, validateRequired } from "@/lib/validation";

const LANGS: { value: Language; label: string }[] = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
];

export function ClientForm({
  client,
  compact,
  onSaved,
}: {
  client?: Client;
  /** Versión corta (para crear cliente dentro de "Nuevo trabajo") */
  compact?: boolean;
  onSaved?: (client: Client) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(client?.name ?? "");
  const [phone, setPhone] = useState(client ? maskPhone(client.phone) : "");
  const [address, setAddress] = useState(client?.address ?? "");
  const [language, setLanguage] = useState<Language>(client?.language ?? "es");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [errors, setErrors] = useState<{ name?: string; phone?: string; address?: string; notes?: string }>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const errs = {
      name: validateRequired(name, "Escribe el nombre del cliente."),
      phone: validatePhone(phone),
      address: address.length > 200 ? "Máximo 200 caracteres." : undefined,
      notes: notes.length > 500 ? "Máximo 500 caracteres." : undefined,
    };
    setErrors(errs);
    if (hasErrors(errs)) return;

    setLoading(true);
    setFormError("");
    const payload = {
      name: name.trim(),
      phone: toE164(phone),
      address: address.trim() || null,
      language,
      notes: notes.trim() || null,
    };
    const supabase = createClient();
    const res = client
      ? await supabase.from("clients").update(payload).eq("id", client.id).select(CLIENT_SELECT).single()
      : await supabase.from("clients").insert(payload).select(CLIENT_SELECT).single();

    if (res.error) {
      setFormError(friendlyError(res.error));
      setLoading(false);
      return;
    }
    const saved = res.data as Client;
    toast(client ? "Cliente actualizado" : "Cliente guardado");
    if (onSaved) {
      setLoading(false);
      onSaved(saved);
      return;
    }
    router.replace(`/clientes/${saved.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && <p className="rounded-xl bg-red-50 px-4 py-3 text-[15px] font-medium text-red-700" role="alert">{formError}</p>}
      <Field label="Nombre" htmlFor="client-name" error={errors.name}>
        <TextInput
          id="client-name"
          autoComplete="off"
          autoCapitalize="words"
          placeholder="Ej: Jennifer Smith"
          value={name}
          onChange={(e) => setName(e.target.value)}
          invalid={!!errors.name}
          maxLength={80}
        />
      </Field>
      <Field label="Teléfono" htmlFor="client-phone" error={errors.phone} hint="Número de EE. UU. (+1)">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[17px] font-semibold text-ink-muted">+1</span>
          <TextInput
            id="client-phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="(555) 123-4567"
            className="pl-12"
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
            invalid={!!errors.phone}
          />
        </div>
      </Field>
      <Field label="Idioma del cliente" hint="Los mensajes de cobro y recibos saldrán en este idioma.">
        <Chips options={LANGS} value={language} onChange={setLanguage} ariaLabel="Idioma del cliente" />
      </Field>
      {!compact && (
        <>
          <Field label="Dirección" htmlFor="client-address" optional error={errors.address}>
            <TextInput
              id="client-address"
              autoComplete="off"
              placeholder="Ej: 123 Main St, Houston, TX"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              invalid={!!errors.address}
              maxLength={200}
            />
          </Field>
          <Field label="Nota" htmlFor="client-notes" optional error={errors.notes}>
            <TextArea
              id="client-notes"
              rows={3}
              placeholder="Ej: El código de la puerta es 1234"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              invalid={!!errors.notes}
              maxLength={500}
            />
          </Field>
        </>
      )}
      <Button type="submit" size="lg" full loading={loading}>
        {client ? "Guardar cambios" : "Guardar cliente"}
      </Button>
    </form>
  );
}
