// Modo "manual": não envia nada; gera um link wa.me com a mensagem pronta
// para o vendedor tocar e enviar pelo próprio WhatsApp.
import { phoneToWaDigits } from "../phone";
import { renderTemplate } from "./templates";
import type { MessagingProvider, OutgoingMessage, SendResult } from "./types";

export function buildWaLink(toE164: string, text: string): string {
  return `https://wa.me/${phoneToWaDigits(toE164)}?text=${encodeURIComponent(text)}`;
}

export class ManualMessagingProvider implements MessagingProvider {
  readonly mode = "manual" as const;

  async send(msg: OutgoingMessage): Promise<SendResult> {
    const text = renderTemplate(msg.kind, msg.params);
    return { status: "manual_link", channel: "manual", waLink: buildWaLink(msg.to, text), text };
  }
}
