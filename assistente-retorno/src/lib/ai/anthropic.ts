import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { GOAL_LABELS, TONE_LABELS } from "@/lib/domain/labels";
import type { GeneratedMessage, MessageRequest } from "./types";

export const DEFAULT_MODEL = "claude-opus-5-5";

const SYSTEM_PROMPT = `Você escreve rascunhos de mensagens curtas de WhatsApp, em português do Brasil, para um salão de beleza retomar contato com uma cliente. A mensagem será revisada e aprovada por uma pessoa do salão antes de qualquer envio.

Regras obrigatórias:
- Use apenas os fatos fornecidos no pedido. Não invente histórico, preferências, profissionais, resultados ou datas.
- Nunca mencione descontos, promoções, preços, brindes, cupons, horários ou vagas disponíveis, datas específicas ou urgência, a menos que isso esteja literalmente nas "informações adicionais do salão".
- Tom natural, educado e respeitoso; sem pressão de venda. No máximo 3 frases curtas (até cerca de 350 caracteres).
- Se o nome da cliente não for fornecido, não use nome nem placeholder.
- Se for pedido, termine com uma frase simples dizendo que a cliente pode avisar se preferir não receber mensagens.
- No máximo um emoji, e apenas se o tom for descontraído.
- Responda somente com o texto final da mensagem, sem aspas, títulos ou comentários.`;

export class AiGenerationError extends Error {}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 45_000, maxRetries: 2 });
  }
  return client;
}

export function anthropicModel(): string {
  return process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
}

function buildPrompt(req: MessageRequest): string {
  const facts = [
    `Nome do salão: ${req.salonName}`,
    `Nome da cliente: ${req.clientFirstName ?? "(não usar nome)"}`,
    `Serviço relevante: ${req.serviceName ?? "(não informado)"}`,
    req.daysSinceLastVisit != null
      ? `Dias desde a última visita registrada: ${req.daysSinceLastVisit} (não cite o número exato)`
      : null,
    `Objetivo do contato: ${GOAL_LABELS[req.goal]}`,
    `Tom: ${TONE_LABELS[req.tone]}`,
    `Incluir frase de opção de não receber mensagens: ${req.includeOptOut ? "sim" : "não"}`,
    `Informações adicionais do salão: ${req.extraFacts?.trim() || "(nenhuma)"}`,
  ].filter(Boolean);
  return `Escreva a mensagem com base nestes dados:\n${facts.join("\n")}`;
}

export async function generateWithAnthropic(req: MessageRequest): Promise<GeneratedMessage> {
  const model = anthropicModel();
  try {
    const response = await getClient().beta.messages.create({
      model,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildPrompt(req) }],
    });
    if (response.stop_reason === "refusal") {
      throw new AiGenerationError("A IA não gerou esta mensagem. Escreva o texto manualmente.");
    }
    const text = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();
    if (!text) throw new AiGenerationError("A IA retornou uma resposta vazia.");
    return { text, origin: "ai", model: response.model };
  } catch (err) {
    if (err instanceof AiGenerationError) throw err;
    if (err instanceof Anthropic.AuthenticationError) {
      throw new AiGenerationError("Chave de API da IA inválida. Verifique ANTHROPIC_API_KEY.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new AiGenerationError("Limite de uso da IA atingido. Tente novamente em instantes.");
    }
    if (err instanceof Anthropic.APIError) {
      console.error("[ia] erro da API", err.status, err.message);
      throw new AiGenerationError("Falha ao chamar a IA. Tente novamente.");
    }
    console.error("[ia] erro inesperado", err);
    throw new AiGenerationError("Falha ao chamar a IA. Tente novamente.");
  }
}
