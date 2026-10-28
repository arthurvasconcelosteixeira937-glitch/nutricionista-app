"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import type { ActionState } from "@/lib/action-state";

const OPTIONS = [
  { value: "replied", label: "Respondeu" },
  { value: "scheduled", label: "Agendou um horário" },
  { value: "returned", label: "Retornou ao salão (atendimento realizado)" },
  { value: "no_reply", label: "Sem resposta (encerrar)" },
  { value: "not_interested", label: "Sem interesse no momento (encerrar)" },
  { value: "opted_out", label: "Pediu para não receber mensagens" },
] as const;

export function OutcomeForm({
  action,
  contactId,
  today,
  minDate,
  services,
  defaultServiceId,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  contactId: string;
  today: string;
  minDate: string;
  services: { id: string; name: string }[];
  defaultServiceId: string | null;
}) {
  const [type, setType] = useState<(typeof OPTIONS)[number]["value"]>("replied");
  return (
    <ActionForm
      action={action}
      className="grid gap-3 sm:grid-cols-2"
      confirm={
        type === "opted_out"
          ? {
              title: "Registrar pedido para não receber mensagens?",
              description: "A cliente será marcada em todo o sistema e não poderá entrar em novas campanhas.",
              confirmLabel: "Registrar pedido",
            }
          : undefined
      }
    >
      <input type="hidden" name="contactId" value={contactId} />
      <Field label="O que aconteceu?" htmlFor={`type-${contactId}`}>
        <Select id={`type-${contactId}`} name="type" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={type === "returned" ? "Data do atendimento" : "Data"} htmlFor={`date-${contactId}`} required>
        <Input id={`date-${contactId}`} name="date" type="date" defaultValue={today} min={minDate} max={today} required />
      </Field>
      {type === "scheduled" && (
        <Field label="Data marcada (opcional)" htmlFor={`sf-${contactId}`} hint="Atualiza a próxima visita da cliente.">
          <Input id={`sf-${contactId}`} name="scheduledFor" type="date" min={minDate} />
        </Field>
      )}
      {type === "returned" && (
        <>
          <Field label="Serviço realizado" htmlFor={`svc-${contactId}`}>
            <Select id={`svc-${contactId}`} name="serviceId" defaultValue={defaultServiceId ?? ""}>
              <option value="">Não informado</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Valor da venda (R$, opcional)" htmlFor={`amt-${contactId}`} hint="Registrado como valor informado manualmente.">
            <Input id={`amt-${contactId}`} name="amount" inputMode="decimal" placeholder="0,00" />
          </Field>
          <div className="flex items-end">
            <Checkbox name="createVisit" defaultChecked label="Registrar também no histórico de visitas" />
          </div>
        </>
      )}
      {type === "opted_out" && (
        <Field label="Observação" htmlFor={`note-${contactId}`} className="sm:col-span-2">
          <Textarea id={`note-${contactId}`} name="note" rows={2} maxLength={300} />
        </Field>
      )}
      <div className="flex items-end sm:col-span-2">
        <SubmitButton variant="secondary" size="sm">
          Registrar resultado
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
