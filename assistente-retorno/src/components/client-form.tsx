import { ActionForm, SubmitButton } from "./action-form";
import { Field, Input, Select, Textarea } from "./ui";
import type { ActionState } from "@/lib/action-state";
import { CONSENT_LABELS, CONTACT_SOURCE_OPTIONS, LEGAL_BASIS_OPTIONS } from "@/lib/domain/labels";
import { formatPhoneBR } from "@/lib/domain/phone";
import { todayISO } from "@/lib/domain/dates";
import type { ClientRow } from "@/lib/repos/clients";
import type { ServiceRow } from "@/lib/repos/services";

export function ClientForm({
  action,
  client,
  services,
  submitLabel,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  client?: ClientRow;
  services: ServiceRow[];
  submitLabel: string;
}) {
  const today = todayISO();
  return (
    <ActionForm action={action} className="space-y-6">
      {client && <input type="hidden" name="id" value={client.id} />}
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-slate-900">Dados de contato</legend>
        <Field label="Nome" htmlFor="name" required>
          <Input id="name" name="name" required minLength={2} maxLength={120} defaultValue={client?.name} autoComplete="off" />
        </Field>
        <Field label="Telefone (WhatsApp)" htmlFor="phone" required hint="Com DDD. Ex.: (11) 98765-4321">
          <Input
            id="phone"
            name="phone"
            required
            inputMode="tel"
            defaultValue={client ? formatPhoneBR(client.phone) : ""}
            autoComplete="off"
          />
        </Field>
        <Field label="Origem do contato" htmlFor="contactSource" hint="Como a cliente chegou ou como o contato foi obtido.">
          <Input id="contactSource" name="contactSource" list="contact-sources" defaultValue={client?.contact_source ?? ""} maxLength={120} />
          <datalist id="contact-sources">
            {CONTACT_SOURCE_OPTIONS.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </Field>
        <Field label="Próxima visita agendada" htmlFor="nextVisitDate" hint="Se houver. Clientes com visita marcada não aparecem na reativação.">
          <Input id="nextVisitDate" name="nextVisitDate" type="date" defaultValue={client?.next_visit_date ?? ""} />
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-slate-900">Comunicação e privacidade (LGPD)</legend>
        <Field label="A cliente autorizou receber mensagens?" htmlFor="consentStatus" required>
          <Select id="consentStatus" name="consentStatus" defaultValue={client?.consent_status ?? "not_informed"} required>
            {(Object.keys(CONSENT_LABELS) as (keyof typeof CONSENT_LABELS)[]).map((k) => (
              <option key={k} value={k}>
                {CONSENT_LABELS[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Base legal para comunicação" htmlFor="legalBasis" hint="Registre a justificativa aplicável. Na dúvida, use consentimento.">
          <Select id="legalBasis" name="legalBasis" defaultValue={client?.legal_basis ?? ""}>
            <option value="">Não informada</option>
            {LEGAL_BASIS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <p className="text-xs text-slate-500 sm:col-span-2">
          Somente clientes com autorização registrada podem entrar em campanhas de mensagem. Pedidos para não receber mensagens são
          registrados na página da cliente.
        </p>
      </fieldset>

      {!client && (
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="mb-2 text-sm font-semibold text-slate-900">Última visita (opcional)</legend>
          <Field label="Serviço realizado" htmlFor="serviceId">
            <Select id="serviceId" name="serviceId" defaultValue="">
              <option value="">Selecione</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Data da última visita" htmlFor="visitDate">
            <Input id="visitDate" name="visitDate" type="date" max={today} />
          </Field>
          <Field label="Valor (R$)" htmlFor="amount" hint="Opcional">
            <Input id="amount" name="amount" inputMode="decimal" placeholder="0,00" />
          </Field>
        </fieldset>
      )}

      <Field label="Observações" htmlFor="notes" hint="Apenas o necessário para o atendimento. Evite dados sensíveis (ex.: saúde).">
        <Textarea id="notes" name="notes" rows={3} maxLength={1000} defaultValue={client?.notes ?? ""} />
      </Field>

      <div className="flex justify-end">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
