// Regra de acesso comum a todos os provedores (lógica pura, testada).
import type { Subscription } from "../types";
import type { SubscriptionAccess } from "./types";

const DAY = 86_400_000;

export function computeAccess(sub: Subscription | null, now = new Date()): SubscriptionAccess {
  if (!sub) {
    return { canCreateCobros: false, state: "inactive", trialDaysLeft: 0, message: "No encontramos tu suscripción." };
  }

  if (sub.status === "active") {
    const end = sub.current_period_end ? new Date(sub.current_period_end) : null;
    if (!end || end.getTime() > now.getTime()) {
      return { canCreateCobros: true, state: "active", trialDaysLeft: 0, message: "Tu suscripción está activa." };
    }
    return {
      canCreateCobros: false,
      state: "expired",
      trialDaysLeft: 0,
      message: "Tu suscripción venció. Renueva para seguir creando cobros.",
    };
  }

  if (sub.status === "trialing") {
    const msLeft = new Date(sub.trial_ends_at).getTime() - now.getTime();
    if (msLeft > 0) {
      const days = Math.ceil(msLeft / DAY);
      return {
        canCreateCobros: true,
        state: "trial",
        trialDaysLeft: days,
        message: days === 1 ? "Te queda 1 día de prueba gratis." : `Te quedan ${days} días de prueba gratis.`,
      };
    }
    return {
      canCreateCobros: false,
      state: "expired",
      trialDaysLeft: 0,
      message: "Tu prueba gratis terminó. Activa tu suscripción para seguir creando cobros.",
    };
  }

  return {
    canCreateCobros: false,
    state: "inactive",
    trialDaysLeft: 0,
    message: "Tu suscripción no está activa. Puedes ver tu panel, pero no crear cobros nuevos.",
  };
}
