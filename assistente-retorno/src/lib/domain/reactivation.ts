import { daysBetween, formatDateBR } from "./dates";
import type { ConsentStatus } from "./labels";

export type Contactability = "ok" | "no_consent" | "consent_denied" | "opted_out";

export const CONTACTABILITY_LABELS: Record<Contactability, string> = {
  ok: "Pode receber mensagem",
  no_consent: "Sem autorização registrada",
  consent_denied: "Não autorizou mensagens",
  opted_out: "Pediu para não receber mensagens",
};

export interface ReactivationInput {
  consentStatus: ConsentStatus;
  optedOutAt: string | null;
  nextVisitDate: string | null;
  lastVisitDate: string | null;
  lastServiceName: string | null;
  /** Prazo de retorno configurado para o serviço da última visita (null = usa padrão). */
  serviceIntervalDays: number | null;
}

export interface ReactivationOptions {
  today: string;
  defaultIntervalDays: number;
  /** Quando informado, substitui o prazo do serviço (filtro "pelo menos N dias sem visita"). */
  minDaysOverride?: number | null;
}

export interface ReactivationResult {
  due: boolean;
  daysSince: number | null;
  thresholdDays: number;
  thresholdSource: "service" | "default" | "filter";
  daysOverdue: number | null;
  contactability: Contactability;
  /** Explicação em linguagem simples de por que a cliente aparece (ou não) na lista. */
  reasons: string[];
  excludedReason: string | null;
}

export function contactabilityOf(consent: ConsentStatus, optedOutAt: string | null): Contactability {
  if (optedOutAt) return "opted_out";
  if (consent === "denied") return "consent_denied";
  if (consent !== "granted") return "no_consent";
  return "ok";
}

export function evaluateReactivation(
  input: ReactivationInput,
  opts: ReactivationOptions,
): ReactivationResult {
  const contactability = contactabilityOf(input.consentStatus, input.optedOutAt);
  let thresholdDays: number;
  let thresholdSource: ReactivationResult["thresholdSource"];
  if (opts.minDaysOverride != null) {
    thresholdDays = opts.minDaysOverride;
    thresholdSource = "filter";
  } else if (input.serviceIntervalDays != null) {
    thresholdDays = input.serviceIntervalDays;
    thresholdSource = "service";
  } else {
    thresholdDays = opts.defaultIntervalDays;
    thresholdSource = "default";
  }

  const base = { thresholdDays, thresholdSource, contactability };

  if (!input.lastVisitDate) {
    return {
      ...base,
      due: false,
      daysSince: null,
      daysOverdue: null,
      reasons: [],
      excludedReason: "Sem visita registrada.",
    };
  }

  const daysSince = daysBetween(input.lastVisitDate, opts.today);

  if (input.nextVisitDate && input.nextVisitDate >= opts.today) {
    return {
      ...base,
      due: false,
      daysSince,
      daysOverdue: null,
      reasons: [],
      excludedReason: `Já tem próxima visita marcada para ${formatDateBR(input.nextVisitDate)}.`,
    };
  }

  const service = input.lastServiceName ?? "serviço não informado";
  const reasons = [
    `Última visita em ${formatDateBR(input.lastVisitDate)} (${service}), há ${daysSince} dias.`,
  ];
  if (thresholdSource === "service") {
    reasons.push(`O prazo de retorno configurado para ${service} é de ${thresholdDays} dias.`);
  } else if (thresholdSource === "default") {
    reasons.push(`Prazo padrão do salão: ${thresholdDays} dias (o serviço não tem prazo próprio).`);
  } else {
    reasons.push(`Filtro aplicado: pelo menos ${thresholdDays} dias sem visita.`);
  }
  reasons.push("Nenhuma próxima visita registrada.");

  const due = daysSince >= thresholdDays;
  return {
    ...base,
    due,
    daysSince,
    daysOverdue: due ? daysSince - thresholdDays : null,
    reasons,
    excludedReason: due ? null : `Ainda dentro do prazo de retorno (${daysSince} de ${thresholdDays} dias).`,
  };
}
