import { ManualBillingProvider } from "./manual";
import type { BillingProvider } from "./types";

export { PLAN } from "./types";
export type { BillingProvider, SubscriptionAccess } from "./types";

let instance: BillingProvider | null = null;

/** Retorna o provedor configurado em BILLING_PROVIDER (padrão: "manual"). */
export function getBillingProvider(): BillingProvider {
  if (instance) return instance;
  const id = process.env.BILLING_PROVIDER ?? "manual";
  switch (id) {
    // case "stripe": instance = new StripeBillingProvider(); break;  ← plugar aqui no futuro
    case "manual":
    default:
      instance = new ManualBillingProvider();
  }
  return instance;
}
