// Textos das mensagens de WhatsApp (espanhol do México).
// Cada mensagem existe em 2 formas:
//  - template da Meta (nome + parâmetros {{1}}, {{2}}...) para o modo "cloud_api";
//  - texto pronto para o link wa.me no modo "manual".
// IMPORTANTE: os textos abaixo precisam ser IDÊNTICOS aos templates aprovados na Meta
// (veja a seção "Templates de WhatsApp" do README).

export type MessageKind = "cobro_nuevo" | "pago_confirmado_vendedor" | "recibo_cliente" | "recordatorio";

export interface TemplateDef {
  name: string;
  /** Corpo com {{n}} — exatamente o que deve ser cadastrado na Meta. */
  body: string;
  /** Descrição de cada variável (para o README / cadastro na Meta). */
  vars: string[];
  /** Exemplo de valores (a Meta pede exemplos ao cadastrar). */
  example: string[];
}

export const TEMPLATES: Record<MessageKind, TemplateDef> = {
  cobro_nuevo: {
    name: "cobro_nuevo",
    body:
      "Hola {{1}}, {{2}} te envió un cobro de {{3}} por: {{4}}.\n\n" +
      "Paga seguro con OXXO, SPEI o tarjeta aquí: {{5}}\n\n" +
      "Tu pago se confirma directo con Mercado Pago.",
    vars: ["nombre del cliente", "nombre del negocio", "monto", "descripción", "link de pago"],
    example: ["Ana", "Tienda Luna", "$1,250.00 MXN", "2 blusas talla M", "https://cobroseguro.mx/p/AbC123"],
  },
  pago_confirmado_vendedor: {
    name: "pago_confirmado_vendedor",
    body:
      "✅ Pago confirmado de {{1}} de {{2}}. Ya puedes entregar.\n\n" +
      "Concepto: {{3}}\nVerifícalo aquí: {{4}}\n\n" +
      "Confirmado directo con Mercado Pago.",
    vars: ["monto", "nombre del cliente", "descripción", "link de verificación"],
    example: ["$1,250.00 MXN", "Ana", "2 blusas talla M", "https://cobroseguro.mx/v/AbC123"],
  },
  recibo_cliente: {
    name: "recibo_cliente",
    body:
      "Hola {{1}}, {{2}} recibió tu pago de {{3}} por: {{4}}.\n\n" +
      "Folio de Mercado Pago: {{5}}\nPuedes verificarlo aquí: {{6}}\n\n" +
      "¡Gracias por tu compra!",
    vars: ["nombre del cliente", "nombre del negocio", "monto", "descripción", "folio del pago", "link de verificación"],
    example: ["Ana", "Tienda Luna", "$1,250.00 MXN", "2 blusas talla M", "123456789", "https://cobroseguro.mx/v/AbC123"],
  },
  recordatorio: {
    name: "recordatorio_pago",
    body:
      "Hola {{1}}, te recordamos que tienes un pago pendiente de {{2}} con {{3}} por: {{4}}.\n\n" +
      "Puedes pagar con OXXO, SPEI o tarjeta aquí: {{5}}\n\n" +
      "Si ya pagaste, ignora este mensaje.",
    vars: ["nombre del cliente", "monto", "nombre del negocio", "descripción", "link de pago"],
    example: ["Ana", "$1,250.00 MXN", "Tienda Luna", "2 blusas talla M", "https://cobroseguro.mx/p/AbC123"],
  },
};

/** Variáveis de template não podem ter quebra de linha, tab ou 4+ espaços seguidos (regra da Meta). */
export function sanitizeTemplateParam(value: string): string {
  return value.replace(/[\n\r\t]+/g, " ").replace(/ {4,}/g, "   ").trim().slice(0, 900) || "-";
}

/** Monta o texto final substituindo {{n}}. */
export function renderTemplate(kind: MessageKind, params: string[]): string {
  return TEMPLATES[kind].body.replace(/\{\{(\d+)\}\}/g, (_, n) => params[Number(n) - 1] ?? "");
}
