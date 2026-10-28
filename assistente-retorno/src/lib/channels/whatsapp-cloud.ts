/**
 * PONTO DE EXTENSÃO — integração oficial com a WhatsApp Business Platform (Cloud API).
 * NÃO IMPLEMENTADO. Este arquivo documenta o contrato esperado para a próxima fase.
 *
 * Requisitos antes de implementar:
 *  - Conta Meta Business verificada e app com permissão whatsapp_business_messaging.
 *  - Número de telefone registrado na plataforma (WHATSAPP_PHONE_NUMBER_ID).
 *  - Token de acesso de sistema guardado apenas no servidor (WHATSAPP_ACCESS_TOKEN).
 *  - Mensagens iniciadas pela empresa fora da janela de 24h exigem MODELOS aprovados pela Meta;
 *    o texto gerado pela IA serviria de base para variáveis do modelo, não como texto livre.
 *  - Opt-in registrado da cliente (já modelado em clients.consent_status) e respeito a opt-out.
 *  - Webhook assinado (WHATSAPP_APP_SECRET) para status de entrega e respostas, que devem ser
 *    gravados em contact_events com data_source = 'integration'.
 *  - Respeitar limites de envio e qualidade do número; nada de automações não oficiais.
 */
export interface WhatsAppTemplateMessage {
  toE164: string;
  templateName: string;
  languageCode: "pt_BR";
  variables: string[];
}

export interface WhatsAppSender {
  sendTemplate(message: WhatsAppTemplateMessage): Promise<{ providerMessageId: string }>;
}

export function getWhatsAppSender(): WhatsAppSender | null {
  return null; // sem integração configurada nesta versão
}
