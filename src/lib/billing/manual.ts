// Provedor "manual": o dono ativa e desativa vendedores pelo painel /admin.
import { computeAccess } from "./access";
import type { BillingProvider } from "./types";

export class ManualBillingProvider implements BillingProvider {
  readonly id = "manual";

  getAccess = computeAccess;

  async createCheckout(): Promise<null> {
    // Sem checkout: o vendedor fala com o suporte e o admin ativa no /admin.
    return null;
  }
}
