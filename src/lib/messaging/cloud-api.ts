// Modo "cloud_api": envio automático pela WhatsApp Cloud API oficial da Meta,
// usando mensagens de modelo (templates) aprovadas.
// Doc: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
import { phoneToWaDigits } from "../phone";
import { buildWaLink } from "./manual";
import { TEMPLATES, renderTemplate, sanitizeTemplateParam } from "./templates";
import type { MessagingProvider, OutgoingMessage, SendResult } from "./types";

export interface CloudApiConfig {
  token: string;
  phoneNumberId: string;
  apiVersion: string;
  language: string;
  fetchImpl?: typeof fetch;
}

export function buildTemplatePayload(msg: OutgoingMessage, language: string) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phoneToWaDigits(msg.to),
    type: "template",
    template: {
      name: TEMPLATES[msg.kind].name,
      language: { code: language },
      components: [
        {
          type: "body",
          parameters: msg.params.map((p) => ({ type: "text", text: sanitizeTemplateParam(p) })),
        },
      ],
    },
  };
}

export class CloudApiMessagingProvider implements MessagingProvider {
  readonly mode = "cloud_api" as const;
  constructor(private cfg: CloudApiConfig) {}

  async send(msg: OutgoingMessage): Promise<SendResult> {
    const text = renderTemplate(msg.kind, msg.params);
    const fallback = buildWaLink(msg.to, text);
    const doFetch = this.cfg.fetchImpl ?? fetch;
    try {
      const res = await doFetch(
        `https://graph.facebook.com/${this.cfg.apiVersion}/${this.cfg.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${this.cfg.token}`, "Content-Type": "application/json" },
          body: JSON.stringify(buildTemplatePayload(msg, this.cfg.language)),
          signal: AbortSignal.timeout(10_000),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        messages?: { id: string }[];
        error?: { message?: string; code?: number };
      };
      if (!res.ok) {
        const error = `WhatsApp API ${res.status}: ${data.error?.message ?? "error desconocido"}`;
        return { status: "failed", channel: "cloud_api", error, waLink: fallback, text };
      }
      return { status: "sent", channel: "cloud_api", providerMessageId: data.messages?.[0]?.id };
    } catch (e) {
      return { status: "failed", channel: "cloud_api", error: String(e), waLink: fallback, text };
    }
  }
}
