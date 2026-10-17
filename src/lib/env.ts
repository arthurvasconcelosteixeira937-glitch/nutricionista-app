// Leitura centralizada das variáveis de ambiente do SERVIDOR.
// Nunca importe este arquivo em componentes de cliente.

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}. Veja o .env.example.`);
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export const env = {
  appUrl: () => (optional("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000").replace(/\/$/, ""),

  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),

  tokenEncryptionKey: () => required("TOKEN_ENCRYPTION_KEY"),
  adminEmail: () => optional("ADMIN_EMAIL")?.toLowerCase(),
  cronSecret: () => optional("CRON_SECRET"),

  mpClientId: () => required("MP_CLIENT_ID"),
  mpClientSecret: () => required("MP_CLIENT_SECRET"),
  mpWebhookSecret: () => optional("MP_WEBHOOK_SECRET"),
  mpAuthUrl: () => optional("MP_AUTH_URL") ?? "https://auth.mercadopago.com.mx/authorization",
  mpOauthTestToken: () => optional("MP_OAUTH_TEST_TOKEN") === "true",

  messagingMode: (): "cloud_api" | "manual" => {
    const mode = optional("MESSAGING_MODE");
    if (mode === "cloud_api" && optional("WHATSAPP_TOKEN") && optional("WHATSAPP_PHONE_NUMBER_ID")) {
      return "cloud_api";
    }
    return "manual";
  },
  whatsappToken: () => required("WHATSAPP_TOKEN"),
  whatsappPhoneNumberId: () => required("WHATSAPP_PHONE_NUMBER_ID"),
  whatsappApiVersion: () => optional("WHATSAPP_API_VERSION") ?? "v23.0",
  whatsappTemplateLang: () => optional("WHATSAPP_TEMPLATE_LANG") ?? "es_MX",

  billingProvider: () => optional("BILLING_PROVIDER") ?? "manual",
};
