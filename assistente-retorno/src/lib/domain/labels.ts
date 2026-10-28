export type ConsentStatus = "granted" | "not_informed" | "denied";
export type CampaignStatus = "draft" | "active" | "completed";
export type CampaignGoal = "reagendar" | "saber_como_esta" | "lembrete_manutencao";
export type MessageTone = "acolhedor" | "profissional" | "descontraido";
export type ContactStage =
  | "selected"
  | "drafted"
  | "approved"
  | "sent"
  | "replied"
  | "scheduled"
  | "returned"
  | "no_reply"
  | "not_interested"
  | "opted_out";
export type SentChannel = "manual_whatsapp" | "manual_phone" | "manual_in_person" | "manual_other";

export const CONSENT_LABELS: Record<ConsentStatus, string> = {
  granted: "Autorizou mensagens",
  not_informed: "Autorização não registrada",
  denied: "Não autorizou",
};

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Rascunho",
  active: "Em andamento",
  completed: "Concluída",
};

export const GOAL_LABELS: Record<CampaignGoal, string> = {
  reagendar: "Convidar para agendar novamente",
  saber_como_esta: "Saber como a cliente está (relacionamento)",
  lembrete_manutencao: "Lembrar da manutenção do serviço",
};

export const TONE_LABELS: Record<MessageTone, string> = {
  acolhedor: "Acolhedor",
  profissional: "Profissional",
  descontraido: "Descontraído",
};

export const STAGE_LABELS: Record<ContactStage, string> = {
  selected: "Aguardando mensagem",
  drafted: "Mensagem para revisar",
  approved: "Aprovada, a enviar",
  sent: "Enviada, aguardando resposta",
  replied: "Respondeu",
  scheduled: "Agendou",
  returned: "Retornou",
  no_reply: "Sem resposta",
  not_interested: "Sem interesse no momento",
  opted_out: "Pediu para não receber mensagens",
};

export const CHANNEL_LABELS: Record<SentChannel, string> = {
  manual_whatsapp: "WhatsApp (enviado manualmente)",
  manual_phone: "Ligação telefônica",
  manual_in_person: "Pessoalmente",
  manual_other: "Outro meio autorizado",
};

export const LEGAL_BASIS_OPTIONS = [
  { value: "consentimento", label: "Consentimento da cliente" },
  { value: "legitimo_interesse", label: "Legítimo interesse (relacionamento com cliente)" },
  { value: "execucao_contrato", label: "Execução de serviço/agendamento" },
] as const;

export const CONTACT_SOURCE_OPTIONS = [
  "Atendimento no salão",
  "Agenda/sistema anterior",
  "Instagram",
  "Indicação",
  "WhatsApp",
  "Planilha importada",
  "Outro",
] as const;
