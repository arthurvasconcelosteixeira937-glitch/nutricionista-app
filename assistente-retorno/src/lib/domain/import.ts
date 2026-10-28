import { parseFlexibleDate, todayISO } from "./dates";
import { parseBRLToCents } from "./money";
import { normalizeBrazilPhone } from "./phone";
import type { ConsentStatus } from "./labels";

export const IMPORT_FIELDS = [
  { key: "name", label: "Nome", required: true, hints: ["nome", "cliente", "name"] },
  { key: "phone", label: "Telefone", required: true, hints: ["telefone", "celular", "whatsapp", "fone", "phone", "contato"] },
  { key: "service", label: "Serviço realizado", required: false, hints: ["servico", "serviço", "procedimento", "service"] },
  { key: "lastVisit", label: "Data da última visita", required: false, hints: ["ultima", "última", "data", "visita", "atendimento"] },
  { key: "nextVisit", label: "Próxima visita", required: false, hints: ["proxima", "próxima", "agendamento", "retorno"] },
  { key: "amount", label: "Valor da última visita", required: false, hints: ["valor", "preco", "preço", "total"] },
  { key: "notes", label: "Observações", required: false, hints: ["obs", "observacao", "observação", "notas"] },
  { key: "source", label: "Origem do contato", required: false, hints: ["origem", "fonte", "canal"] },
  { key: "consent", label: "Autorizou mensagens?", required: false, hints: ["autoriz", "consent", "aceit", "permit", "opt"] },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];
export type ColumnMapping = Partial<Record<ImportFieldKey, number>>;

export const MAX_IMPORT_ROWS = 2000;

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Sugere o mapeamento de colunas a partir dos cabeçalhos da planilha. */
export function guessMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<number>();
  const normalized = headers.map(normalizeHeader);
  // Campos mais específicos primeiro, para "próxima visita" não ser capturada por "visita".
  const order: ImportFieldKey[] = ["nextVisit", "lastVisit", "phone", "name", "service", "amount", "notes", "source", "consent"];
  for (const key of order) {
    const field = IMPORT_FIELDS.find((f) => f.key === key)!;
    const hints = field.hints.map(normalizeHeader);
    const idx = normalized.findIndex((h, i) => !used.has(i) && hints.some((hint) => h.includes(hint)));
    if (idx >= 0) {
      mapping[key] = idx;
      used.add(idx);
    }
  }
  return mapping;
}

export interface RawImportRow {
  name?: string;
  phone?: string;
  service?: string;
  lastVisit?: string;
  nextVisit?: string;
  amount?: string;
  notes?: string;
  source?: string;
  consent?: string;
}

export function applyMapping(rows: string[][], mapping: ColumnMapping): RawImportRow[] {
  return rows.map((cells) => {
    const out: RawImportRow = {};
    for (const [key, idx] of Object.entries(mapping) as [ImportFieldKey, number | undefined][]) {
      if (idx == null || idx < 0) continue;
      out[key] = (cells[idx] ?? "").trim();
    }
    return out;
  });
}

export interface ValidatedImportRow {
  line: number;
  name: string;
  phone: string | null;
  service: string | null;
  lastVisit: string | null;
  nextVisit: string | null;
  amountCents: number | null;
  notes: string | null;
  source: string | null;
  consent: ConsentStatus;
  errors: string[];
  warnings: string[];
  duplicateOf: "file" | "existing" | null;
}

export function parseConsent(raw: string | undefined): ConsentStatus | "invalid" {
  const v = normalizeHeader(raw ?? "");
  if (!v) return "not_informed";
  if (["sim", "s", "yes", "y", "1", "true", "autorizado", "autorizou", "aceita", "aceitou"].includes(v)) return "granted";
  if (["nao", "n", "no", "0", "false", "recusou", "nao autorizado", "nao autorizou"].includes(v)) return "denied";
  return "invalid";
}

/**
 * Valida as linhas de uma importação. É executada no servidor (fonte da verdade),
 * mas não depende do banco: duplicidades com clientes existentes são marcadas
 * a partir do conjunto `existingPhones` recebido.
 */
export function validateImportRows(
  rows: RawImportRow[],
  existingPhones: Set<string>,
  today = todayISO(),
): ValidatedImportRow[] {
  const seen = new Set<string>();
  return rows.map((r, i) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const name = (r.name ?? "").replace(/\s+/g, " ").trim();
    if (!name) errors.push("Nome em branco.");
    else if (name.length > 120) errors.push("Nome muito longo.");

    let phone: string | null = null;
    if (!r.phone) errors.push("Telefone em branco.");
    else {
      phone = normalizeBrazilPhone(r.phone);
      if (!phone) errors.push(`Telefone inválido: "${r.phone}".`);
    }

    let lastVisit: string | null = null;
    if (r.lastVisit) {
      lastVisit = parseFlexibleDate(r.lastVisit);
      if (!lastVisit) errors.push(`Data da última visita inválida: "${r.lastVisit}".`);
      else if (lastVisit > today) errors.push("Data da última visita está no futuro.");
    } else {
      warnings.push("Sem data da última visita: a cliente não entrará na lista de reativação.");
    }

    let nextVisit: string | null = null;
    if (r.nextVisit) {
      nextVisit = parseFlexibleDate(r.nextVisit);
      if (!nextVisit) errors.push(`Data da próxima visita inválida: "${r.nextVisit}".`);
    }

    let amountCents: number | null = null;
    if (r.amount) {
      amountCents = parseBRLToCents(r.amount);
      if (amountCents == null) warnings.push(`Valor ignorado (formato não reconhecido): "${r.amount}".`);
    }

    const service = r.service?.trim() || null;
    if (lastVisit && !service) warnings.push("Visita sem serviço: será usado o prazo padrão do salão.");

    const consentParsed = parseConsent(r.consent);
    let consent: ConsentStatus = "not_informed";
    if (consentParsed === "invalid") {
      warnings.push(`Autorização não reconhecida ("${r.consent}"): registrada como não informada.`);
    } else consent = consentParsed;

    let duplicateOf: ValidatedImportRow["duplicateOf"] = null;
    if (phone) {
      if (existingPhones.has(phone)) duplicateOf = "existing";
      else if (seen.has(phone)) duplicateOf = "file";
      seen.add(phone);
    }

    return {
      line: i + 2, // +1 do cabeçalho, +1 para contagem humana
      name,
      phone,
      service,
      lastVisit,
      nextVisit,
      amountCents,
      notes: r.notes?.trim().slice(0, 1000) || null,
      source: r.source?.trim().slice(0, 120) || null,
      consent,
      errors,
      warnings,
      duplicateOf,
    };
  });
}
