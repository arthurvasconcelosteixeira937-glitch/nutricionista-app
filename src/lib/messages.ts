import { formatDate, formatMoney, daysBetween } from "./format";
import type { Language, PaymentInfo, TemplateKey } from "./types";

export interface MessageJob {
  description: string;
  service_date: string;
  due_date: string;
  balance: number;
}

export interface MessageInput {
  template: TemplateKey;
  language: Language;
  clientName: string;
  businessName: string;
  jobs: MessageJob[];
  today: string;
  payment: PaymentInfo;
}

export const TEMPLATE_META: Record<TemplateKey, { label: string; hint: string }> = {
  amigable: { label: "Amigable", hint: "Primer recordatorio" },
  firme: { label: "Firme", hint: "Segundo recordatorio" },
  ultimo: { label: "Último aviso", hint: "Cuando ya cobraste varias veces" },
};

/** Amigable si nunca cobró, Firme si cobró 1 vez, Último aviso desde la 3.ª vez. */
export function suggestTemplate(timesSent: number): TemplateKey {
  if (timesSent <= 0) return "amigable";
  if (timesSent === 1) return "firme";
  return "ultimo";
}

export function venmoUrl(user: string) {
  return `https://venmo.com/u/${encodeURIComponent(user)}`;
}

export function cashAppUrl(tag: string, amount?: number) {
  const base = `https://cash.app/$${encodeURIComponent(tag)}`;
  return amount && amount > 0 ? `${base}/${amount.toFixed(2)}` : base;
}

export function paymentLines(payment: PaymentInfo, language: Language, amount?: number): string[] {
  const lines: string[] = [];
  if (payment.zelle) lines.push(`• Zelle: ${payment.zelle}`);
  if (payment.venmo) lines.push(`• Venmo: @${payment.venmo} → ${venmoUrl(payment.venmo)}`);
  if (payment.cashapp) lines.push(`• Cash App: $${payment.cashapp} → ${cashAppUrl(payment.cashapp, amount)}`);
  if (payment.accepts_cash) lines.push(language === "en" ? "• Cash" : "• Efectivo");
  return lines;
}

function jobLines(jobs: MessageJob[]): string {
  return jobs
    .map((j) => `• ${j.description} (${formatDate(j.service_date)}): ${formatMoney(j.balance)}`)
    .join("\n");
}

export function buildMessage(input: MessageInput): string {
  const { template, language, clientName, businessName, jobs, today, payment } = input;
  const name = clientName.trim().split(/\s+/)[0] || clientName;
  const total = jobs.reduce((acc, j) => acc + Math.round(j.balance * 100), 0) / 100;
  const money = formatMoney(total);
  const single = jobs.length === 1 ? jobs[0] : null;
  const maxOverdue = Math.max(0, ...jobs.map((j) => daysBetween(j.due_date, today)));
  const lines = paymentLines(payment, language, total);
  const sign = businessName.trim();

  if (language === "en") {
    const what = single
      ? `${single.description} on ${formatDate(single.service_date)}`
      : `the following services:\n${jobLines(jobs)}`;
    const payBlock = lines.length ? `\n\nYou can pay me by:\n${lines.join("\n")}` : "";

    if (template === "amigable") {
      return (
        `Hi ${name}! This is ${sign}. 😊\n\n` +
        `Just a friendly reminder about the payment for ${what}.\n` +
        `Total: ${money}` +
        payBlock +
        `\n\nThank you so much!`
      );
    }
    if (template === "firme") {
      const due = single ? ` It was due on ${formatDate(single.due_date)}.` : "";
      return (
        `Hello ${name}, this is ${sign}.\n\n` +
        `I still haven't received the payment for ${what}.\n` +
        `Amount due: ${money}.${due}\n\n` +
        `Please send the payment today.` +
        payBlock +
        `\n\nThank you.`
      );
    }
    const late = maxOverdue > 0 ? `, which is ${maxOverdue} day${maxOverdue === 1 ? "" : "s"} past due` : "";
    return (
      `${name}, this is a FINAL NOTICE from ${sign}.\n\n` +
      `The payment of ${money} for ${what} is still pending${late}.\n\n` +
      `If I don't receive the payment within the next 48 hours, I will have to take further action.` +
      payBlock +
      `\n\n${sign}`
    );
  }

  const what = single
    ? `${single.description} del ${formatDate(single.service_date)}`
    : `los siguientes servicios:\n${jobLines(jobs)}`;
  const payBlock = lines.length ? `\n\nPuedes pagarme por:\n${lines.join("\n")}` : "";

  if (template === "amigable") {
    return (
      `¡Hola ${name}! Te saluda ${sign}. 😊\n\n` +
      `Te recuerdo amablemente el pago de ${what}.\n` +
      `Total: ${money}` +
      payBlock +
      `\n\n¡Muchas gracias!`
    );
  }
  if (template === "firme") {
    const due = single ? ` Venció el ${formatDate(single.due_date)}.` : "";
    return (
      `Hola ${name}, te escribe ${sign}.\n\n` +
      `Todavía no he recibido el pago de ${what}.\n` +
      `Monto pendiente: ${money}.${due}\n\n` +
      `Por favor realiza el pago hoy.` +
      payBlock +
      `\n\nGracias.`
    );
  }
  const late = maxOverdue > 0 ? `, con ${maxOverdue} día${maxOverdue === 1 ? "" : "s"} de atraso` : "";
  return (
    `${name}, este es el ÚLTIMO AVISO de ${sign}.\n\n` +
    `El pago de ${money} por ${what} sigue pendiente${late}.\n\n` +
    `Si no recibo el pago en las próximas 48 horas, tendré que tomar otras medidas.` +
    payBlock +
    `\n\n${sign}`
  );
}

/** Teléfono E.164 (+15551234567) → link de WhatsApp. */
export function whatsappLink(e164: string, text: string): string {
  return `https://wa.me/${e164.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

/** Link de SMS compatible con iPhone y Android. */
export function smsLink(e164: string, text: string): string {
  return `sms:${e164}?&body=${encodeURIComponent(text)}`;
}
