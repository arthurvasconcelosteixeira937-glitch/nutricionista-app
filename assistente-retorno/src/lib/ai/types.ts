import type { CampaignGoal, MessageTone } from "@/lib/domain/labels";

export interface MessageRequest {
  /** Usado só para variar o modelo de texto no modo demonstrativo. */
  seed: string;
  clientFirstName: string | null;
  salonName: string;
  serviceName: string | null;
  daysSinceLastVisit: number | null;
  tone: MessageTone;
  goal: CampaignGoal;
  includeOptOut: boolean;
  /** Informações que o próprio salão escreveu na campanha (únicos fatos extras permitidos). */
  extraFacts: string | null;
}

export interface GeneratedMessage {
  text: string;
  origin: "ai" | "demo_template";
  model: string | null;
}

export interface AiStatus {
  mode: "anthropic" | "demo";
  model: string | null;
  label: string;
}
