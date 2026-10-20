import type { PaymentMethod, Recurrence, ServiceType } from "./types";

export const APP_NAME = "Cóbralo";
export const PRICE_LABEL = "US$9.90";
export const TRIAL_DAYS = 7;

export const SUPPORT_WHATSAPP = "5591981490959";
export const SUPPORT_URL = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
  "Hola, necesito ayuda con Cóbralo."
)}`;

export const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: "limpieza", label: "Limpieza" },
  { value: "jardineria", label: "Jardinería" },
  { value: "construccion", label: "Construcción" },
  { value: "pintura", label: "Pintura" },
  { value: "mudanzas", label: "Mudanzas" },
  { value: "handyman", label: "Handyman" },
  { value: "otro", label: "Otro" },
];

export const SERVICE_SUGGESTIONS: Record<ServiceType, string[]> = {
  limpieza: ["Limpieza de casa", "Limpieza profunda", "Limpieza de oficina"],
  jardineria: ["Corte de césped", "Mantenimiento de jardín", "Limpieza de hojas"],
  construccion: ["Drywall", "Remodelación", "Instalación de piso"],
  pintura: ["Pintura interior", "Pintura exterior", "Pintura de cuarto"],
  mudanzas: ["Mudanza local", "Carga y descarga", "Mudanza de apartamento"],
  handyman: ["Reparación", "Instalación", "Mantenimiento"],
  otro: [],
};

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; labelEn: string }[] = [
  { value: "zelle", label: "Zelle", labelEn: "Zelle" },
  { value: "venmo", label: "Venmo", labelEn: "Venmo" },
  { value: "cashapp", label: "Cash App", labelEn: "Cash App" },
  { value: "efectivo", label: "Efectivo", labelEn: "Cash" },
  { value: "cheque", label: "Cheque", labelEn: "Check" },
  { value: "otro", label: "Otro", labelEn: "Other" },
];

export const RECURRENCES: { value: Recurrence; label: string }[] = [
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Cada 2 semanas" },
  { value: "monthly", label: "Mensual" },
];

export function methodLabel(method: PaymentMethod, lang: "es" | "en" = "es") {
  const m = PAYMENT_METHODS.find((p) => p.value === method);
  if (!m) return method;
  return lang === "en" ? m.labelEn : m.label;
}

export function recurrenceLabel(r: Recurrence | null) {
  return RECURRENCES.find((x) => x.value === r)?.label ?? "";
}

export function serviceLabel(s: ServiceType | null) {
  return SERVICE_TYPES.find((x) => x.value === s)?.label ?? "";
}
