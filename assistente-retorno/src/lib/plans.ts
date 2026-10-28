/**
 * Planos comerciais — HIPÓTESES de preço e limites para validação com salões.
 * Não há cobrança implementada. Ajuste aqui sem mexer no restante do código.
 */
export type PlanId = "piloto" | "basico" | "avancado";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  monthlyPriceCents: number;
  limits: {
    maxClients: number;
    maxActiveCampaigns: number;
    aiMessagesPerMonth: number;
    maxUsers: number;
  };
  features: {
    csvImport: boolean;
    reports: boolean;
    whatsappIntegration: boolean; // futuro — integração oficial ainda não implementada
  };
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  piloto: {
    id: "piloto",
    name: "Piloto",
    monthlyPriceCents: 9700,
    limits: { maxClients: 500, maxActiveCampaigns: 2, aiMessagesPerMonth: 200, maxUsers: 1 },
    features: { csvImport: true, reports: true, whatsappIntegration: false },
  },
  basico: {
    id: "basico",
    name: "Básico",
    monthlyPriceCents: 19700,
    limits: { maxClients: 2000, maxActiveCampaigns: 5, aiMessagesPerMonth: 1000, maxUsers: 3 },
    features: { csvImport: true, reports: true, whatsappIntegration: false },
  },
  avancado: {
    id: "avancado",
    name: "Avançado",
    monthlyPriceCents: 29700,
    limits: { maxClients: 10000, maxActiveCampaigns: 20, aiMessagesPerMonth: 5000, maxUsers: 10 },
    features: { csvImport: true, reports: true, whatsappIntegration: true },
  },
};

export function getPlan(id: string): PlanDefinition {
  return PLANS[id as PlanId] ?? PLANS.piloto;
}
