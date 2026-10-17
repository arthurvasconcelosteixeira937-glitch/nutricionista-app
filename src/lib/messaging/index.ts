import { env } from "../env";
import { CloudApiMessagingProvider } from "./cloud-api";
import { ManualMessagingProvider } from "./manual";
import type { MessagingProvider } from "./types";

export { TEMPLATES, renderTemplate } from "./templates";
export type { MessageKind } from "./templates";
export type { MessagingProvider, OutgoingMessage, SendResult } from "./types";
export { buildWaLink } from "./manual";

/**
 * "cloud_api" só é usado se MESSAGING_MODE=cloud_api E as credenciais existirem.
 * Caso contrário, o app funciona 100% no modo "manual" (links wa.me).
 */
export function getMessagingProvider(): MessagingProvider {
  if (env.messagingMode() === "cloud_api") {
    return new CloudApiMessagingProvider({
      token: env.whatsappToken(),
      phoneNumberId: env.whatsappPhoneNumberId(),
      apiVersion: env.whatsappApiVersion(),
      language: env.whatsappTemplateLang(),
    });
  }
  return new ManualMessagingProvider();
}
