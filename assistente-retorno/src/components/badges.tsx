import { Badge } from "./ui";
import { CONSENT_LABELS, STAGE_LABELS, type ConsentStatus, type ContactStage } from "@/lib/domain/labels";
import { CONTACTABILITY_LABELS, type Contactability } from "@/lib/domain/reactivation";

export function ConsentBadge({ consent, optedOut }: { consent: ConsentStatus; optedOut: boolean }) {
  if (optedOut) return <Badge tone="danger">Pediu para não receber</Badge>;
  const tone = consent === "granted" ? "success" : consent === "denied" ? "danger" : "warning";
  return <Badge tone={tone}>{CONSENT_LABELS[consent]}</Badge>;
}

export function ContactabilityBadge({ value }: { value: Contactability }) {
  const tone = value === "ok" ? "success" : value === "no_consent" ? "warning" : "danger";
  return <Badge tone={tone}>{CONTACTABILITY_LABELS[value]}</Badge>;
}

const STAGE_TONES: Record<ContactStage, "neutral" | "brand" | "success" | "warning" | "danger" | "info"> = {
  selected: "neutral",
  drafted: "warning",
  approved: "info",
  sent: "brand",
  replied: "info",
  scheduled: "success",
  returned: "success",
  no_reply: "neutral",
  not_interested: "neutral",
  opted_out: "danger",
};

export function StageBadge({ stage }: { stage: ContactStage }) {
  return <Badge tone={STAGE_TONES[stage]}>{STAGE_LABELS[stage]}</Badge>;
}
