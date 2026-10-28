import { Checkbox, Field, Input, Select, Textarea } from "./ui";
import { GOAL_LABELS, TONE_LABELS, type CampaignGoal, type MessageTone } from "@/lib/domain/labels";
import type { CampaignRow } from "@/lib/repos/campaigns";
import type { ServiceRow } from "@/lib/repos/services";

/** Campos de configuração da campanha (criação e edição). */
export function CampaignFields({
  services,
  salonName,
  campaign,
}: {
  services: ServiceRow[];
  salonName: string;
  campaign?: CampaignRow;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nome da campanha" htmlFor="name" required>
        <Input id="name" name="name" required minLength={3} maxLength={120} defaultValue={campaign?.name} placeholder="Ex.: Retorno de coloração — novembro" />
      </Field>
      <Field label="Nome do salão na mensagem" htmlFor="salonDisplayName" required>
        <Input id="salonDisplayName" name="salonDisplayName" required maxLength={80} defaultValue={campaign?.salon_display_name ?? salonName} />
      </Field>
      <Field label="Objetivo do contato" htmlFor="goal" required>
        <Select id="goal" name="goal" defaultValue={campaign?.goal ?? "reagendar"}>
          {(Object.keys(GOAL_LABELS) as CampaignGoal[]).map((g) => (
            <option key={g} value={g}>
              {GOAL_LABELS[g]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Tom da mensagem" htmlFor="tone" required>
        <Select id="tone" name="tone" defaultValue={campaign?.tone ?? "acolhedor"}>
          {(Object.keys(TONE_LABELS) as MessageTone[]).map((t) => (
            <option key={t} value={t}>
              {TONE_LABELS[t]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Serviço relevante" htmlFor="serviceFocus" hint="Vazio = usa o serviço da última visita de cada cliente.">
        <Select id="serviceFocus" name="serviceFocus" defaultValue={campaign?.service_focus ?? ""}>
          <option value="">Serviço da última visita</option>
          {services.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Janela de atribuição (dias)"
        htmlFor="attributionWindowDays"
        required
        hint="Retornos registrados até N dias depois do envio contam para a campanha."
      >
        <Input
          id="attributionWindowDays"
          name="attributionWindowDays"
          type="number"
          min={1}
          max={180}
          required
          defaultValue={campaign?.attribution_window_days ?? 30}
        />
      </Field>
      <Field label="Objetivo interno (opcional)" htmlFor="objective" className="sm:col-span-2">
        <Input id="objective" name="objective" maxLength={500} defaultValue={campaign?.objective ?? ""} placeholder="Ex.: testar se clientes de coloração respondem a um lembrete simples" />
      </Field>
      <Field
        label="Informações adicionais para a mensagem (opcional)"
        htmlFor="extraFacts"
        className="sm:col-span-2"
        hint="Só o que for verdade e você quiser mencionar (ex.: “temos horários aos sábados”). A IA não pode inventar descontos, preços ou disponibilidade."
      >
        <Textarea id="extraFacts" name="extraFacts" rows={2} maxLength={400} defaultValue={campaign?.extra_facts ?? ""} />
      </Field>
      <div className="space-y-2 sm:col-span-2">
        <Checkbox name="includeName" defaultChecked={campaign ? campaign.include_name === 1 : true} label="Chamar a cliente pelo primeiro nome" />
        <Checkbox
          name="includeOptOut"
          defaultChecked={campaign ? campaign.include_opt_out === 1 : true}
          label="Incluir frase dizendo que a cliente pode pedir para não receber mensagens"
          hint="Recomendado (LGPD): facilita o exercício do direito de oposição."
        />
      </div>
    </div>
  );
}
