import type { Profile } from "./types";

const ACTIVE_STATUSES = ["active", "trialing", "past_due"];

type SubFields = Pick<Profile, "subscription_status" | "trial_ends_at">;

export function isSubscribed(p: SubFields): boolean {
  return ACTIVE_STATUSES.includes(p.subscription_status ?? "");
}

export function trialActive(p: SubFields, now: Date = new Date()): boolean {
  return new Date(p.trial_ends_at).getTime() > now.getTime();
}

export function hasAccess(p: SubFields, now: Date = new Date()): boolean {
  return isSubscribed(p) || trialActive(p, now);
}

/** Días de prueba que quedan (redondeado hacia arriba). 0 si ya terminó. */
export function trialDaysLeft(p: SubFields, now: Date = new Date()): number {
  const ms = new Date(p.trial_ends_at).getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}
