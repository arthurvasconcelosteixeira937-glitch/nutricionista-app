import "server-only";
import { generateDemoMessage } from "./demo";
import { anthropicModel, generateWithAnthropic } from "./anthropic";
import type { AiStatus, GeneratedMessage, MessageRequest } from "./types";

export type { AiStatus, GeneratedMessage, MessageRequest } from "./types";
export { AiGenerationError } from "./anthropic";

/** A IA real só é usada quando há chave configurada no servidor e AI_PROVIDER não força o modo demo. */
export function getAiStatus(): AiStatus {
  if (process.env.ANTHROPIC_API_KEY && process.env.AI_PROVIDER !== "demo") {
    return { mode: "anthropic", model: anthropicModel(), label: "IA ativa (Anthropic Claude)" };
  }
  return {
    mode: "demo",
    model: null,
    label: "Modo demonstrativo: modelos de texto fixos, sem IA",
  };
}

export async function generateMessage(req: MessageRequest): Promise<GeneratedMessage> {
  if (getAiStatus().mode === "anthropic") return generateWithAnthropic(req);
  return generateDemoMessage(req);
}
