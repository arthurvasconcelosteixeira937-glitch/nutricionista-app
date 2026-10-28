/**
 * Canais de envio. Na primeira versão TODO envio é feito manualmente pela pessoa do salão
 * (o sistema apenas registra). Não há disparo automático nem em massa.
 *
 * Integração futura: WhatsApp Business Platform (Cloud API) oficial — ver whatsapp-cloud.ts.
 */
import type { SentChannel } from "@/lib/domain/labels";

export interface ChannelInfo {
  id: SentChannel | "whatsapp_cloud_api";
  label: string;
  automated: boolean;
  available: boolean;
  note: string;
}

export const CHANNELS: ChannelInfo[] = [
  { id: "manual_whatsapp", label: "WhatsApp (envio manual)", automated: false, available: true, note: "A pessoa do salão abre a conversa e envia a mensagem aprovada." },
  { id: "manual_phone", label: "Ligação telefônica", automated: false, available: true, note: "Contato por telefone registrado manualmente." },
  { id: "manual_in_person", label: "Pessoalmente", automated: false, available: true, note: "Contato presencial registrado manualmente." },
  { id: "manual_other", label: "Outro meio autorizado", automated: false, available: true, note: "Outro canal em que a cliente autorizou contato." },
  { id: "whatsapp_cloud_api", label: "WhatsApp Business Platform (oficial)", automated: true, available: false, note: "Não implementado. Requer conta Meta Business verificada, número aprovado e modelos de mensagem aprovados." },
];

/**
 * Link oficial "click to chat" do WhatsApp (wa.me). Abre a conversa no aparelho da própria
 * pessoa do salão com o texto preenchido; o envio continua sendo um ato manual dela.
 */
export function whatsappClickToChatUrl(phoneE164: string, text: string): string {
  return `https://wa.me/${phoneE164.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
