import { z } from "zod";
import { isValidISODate, todayISO } from "@/lib/domain/dates";
import { parseBRLToCents } from "@/lib/domain/money";
import { normalizeBrazilPhone } from "@/lib/domain/phone";

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label}: no máximo ${max} caracteres.`)
    .optional()
    .transform((v) => (v ? v : null));

const optionalDate = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || isValidISODate(v), `${label}: data inválida.`)
    .transform((v) => (v ? v : null));

const requiredDate = (label: string) =>
  z.string().trim().refine((v) => isValidISODate(v), `${label}: informe uma data válida.`);

const optionalMoney = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || parseBRLToCents(v) != null, "Valor: use o formato 150,00.")
  .transform((v) => (v ? parseBRLToCents(v) : null));

const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true" || v === "1");

export const phoneField = z
  .string()
  .trim()
  .min(1, "Telefone: obrigatório.")
  .transform((v, ctx) => {
    const normalized = normalizeBrazilPhone(v);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Telefone: informe DDD + número, ex.: (11) 98765-4321." });
      return z.NEVER;
    }
    return normalized;
  });

export const clientSchema = z.object({
  name: z.string().trim().min(2, "Nome: informe ao menos 2 caracteres.").max(120, "Nome: muito longo."),
  phone: phoneField,
  notes: optionalText(1000, "Observações"),
  contactSource: optionalText(120, "Origem do contato"),
  legalBasis: z
    .enum(["consentimento", "legitimo_interesse", "execucao_contrato", ""])
    .optional()
    .transform((v) => (v ? v : null)),
  consentStatus: z.enum(["granted", "not_informed", "denied"], "Autorização: escolha uma opção."),
  nextVisitDate: optionalDate("Próxima visita"),
});

export const visitSchema = z
  .object({
    serviceId: optionalText(64, "Serviço"),
    visitDate: optionalDate("Data da visita"),
    amount: optionalMoney,
  })
  .refine((v) => !v.visitDate || v.visitDate <= todayISO(), "Data da visita não pode estar no futuro.");

export const requiredVisitSchema = z
  .object({
    serviceId: optionalText(64, "Serviço"),
    visitDate: requiredDate("Data da visita"),
    amount: optionalMoney,
  })
  .refine((v) => v.visitDate <= todayISO(), "Data da visita não pode estar no futuro.");

export const campaignSchema = z.object({
  name: z.string().trim().min(3, "Nome da campanha: ao menos 3 caracteres.").max(120),
  objective: optionalText(500, "Objetivo"),
  goal: z.enum(["reagendar", "saber_como_esta", "lembrete_manutencao"], "Escolha o objetivo do contato."),
  tone: z.enum(["acolhedor", "profissional", "descontraido"], "Escolha o tom da mensagem."),
  serviceFocus: optionalText(120, "Serviço"),
  salonDisplayName: z.string().trim().min(2, "Nome do salão: obrigatório.").max(80),
  includeName: checkbox,
  includeOptOut: checkbox,
  extraFacts: optionalText(400, "Informações adicionais"),
  attributionWindowDays: z.coerce
    .number("Janela de atribuição: informe um número.")
    .int()
    .min(1, "Janela de atribuição: mínimo 1 dia.")
    .max(180, "Janela de atribuição: máximo 180 dias."),
});

export const outcomeSchema = z.object({
  type: z.enum(["replied", "scheduled", "returned", "no_reply", "not_interested", "opted_out"]),
  date: requiredDate("Data"),
  scheduledFor: optionalDate("Data agendada"),
  amount: optionalMoney,
  serviceId: optionalText(64, "Serviço"),
  createVisit: checkbox,
  note: optionalText(300, "Observação"),
});

export const serviceSchema = z.object({
  id: optionalText(64, "id"),
  name: z.string().trim().min(2, "Serviço: informe o nome.").max(80),
  returnIntervalDays: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v == null || (Number.isInteger(v) && v >= 1 && v <= 730), "Prazo de retorno: entre 1 e 730 dias."),
});

export const settingsSchema = z.object({
  name: z.string().trim().min(2, "Nome do salão: obrigatório.").max(80),
  defaultIntervalDays: z.coerce.number().int().min(7, "Prazo padrão: mínimo 7 dias.").max(730),
  dataRetentionMonths: z.coerce.number().int().min(6, "Retenção: mínimo 6 meses.").max(120),
});

export const loginSchema = z.object({
  email: z.email("E-mail inválido.").trim().toLowerCase(),
  password: z.string().min(1, "Informe a senha."),
});

export const signupSchema = z.object({
  salonName: z.string().trim().min(2, "Nome do salão: obrigatório.").max(80),
  userName: z.string().trim().min(2, "Seu nome: obrigatório.").max(80),
  email: z.email("E-mail inválido.").trim().toLowerCase(),
  password: z.string().min(8, "Senha: mínimo de 8 caracteres.").max(200),
  acceptTerms: z.literal("on", "Confirme que leu o aviso sobre o protótipo."),
});
