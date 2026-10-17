// Camada de assinatura (BillingProvider).
// Hoje existe só a implementação "manual" (o admin ativa/desativa no /admin).
// Para plugar Stripe (ou outra), crie uma classe que implemente esta interface
// e registre em ./index.ts — o resto do app não precisa mudar.
import type { Subscription } from "../types";

export const PLAN = {
  name: "CobroSeguro",
  priceMxn: 199,
  trialDays: 7,
} as const;

export interface SubscriptionAccess {
  /** Pode criar cobros novos? */
  canCreateCobros: boolean;
  state: "trial" | "active" | "expired" | "inactive";
  trialDaysLeft: number;
  message: string;
}

export interface BillingProvider {
  readonly id: string;

  /** Regras de acesso a partir do registro de assinatura. */
  getAccess(sub: Subscription | null, now?: Date): SubscriptionAccess;

  /**
   * Inicia o pagamento da assinatura. Retorna URL para redirecionar o vendedor,
   * ou null se o provedor não tiver checkout (caso do "manual").
   */
  createCheckout(sellerId: string, email: string): Promise<{ url: string } | null>;

  /** Processa webhooks do provedor (Stripe etc.). O manual não usa. */
  handleWebhook?(request: Request): Promise<Response>;
}
