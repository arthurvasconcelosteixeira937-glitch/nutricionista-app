import type { MessageKind } from "./templates";

export interface OutgoingMessage {
  kind: MessageKind;
  /** Telefone em E.164 (+52XXXXXXXXXX). */
  to: string;
  /** Parâmetros na ordem {{1}}, {{2}}... */
  params: string[];
}

export type SendResult =
  | { status: "sent"; channel: "cloud_api"; providerMessageId?: string }
  | { status: "manual_link"; channel: "manual"; waLink: string; text: string }
  | { status: "failed"; channel: "cloud_api"; error: string; waLink: string; text: string };

export interface MessagingProvider {
  readonly mode: "cloud_api" | "manual";
  send(msg: OutgoingMessage): Promise<SendResult>;
}
