// Tipos de domínio compartilhados (espelham as tabelas do Supabase).

export type CobroStatus = "pendiente" | "pagado" | "vencido" | "cancelado" | "reembolsado";

export interface Cobro {
  id: string;
  seller_id: string;
  public_code: string;
  customer_name: string;
  customer_phone: string;
  amount: number | string; // numeric chega como string do PostgREST
  currency: string;
  description: string;
  due_at: string | null;
  status: CobroStatus;
  mp_preference_id: string | null;
  checkout_url: string | null;
  mp_payment_id: string | null;
  paid_amount: number | string | null;
  paid_at: string | null;
  payment_method: string | null;
  canceled_at: string | null;
  reminders_enabled: boolean;
  reminders_sent: number;
  last_reminder_at: string | null;
  seller_notified_at: string | null;
  receipt_sent_at: string | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  business_name: string | null;
  whatsapp: string | null;
  onboarding_completed: boolean;
  reminders_enabled: boolean;
  created_at: string;
}

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "inactive" | "canceled";

export interface Subscription {
  seller_id: string;
  provider: string;
  status: SubscriptionStatus;
  trial_ends_at: string;
  current_period_end: string | null;
  provider_customer_id?: string | null;
  provider_subscription_id?: string | null;
}

/** Subconjunto do objeto de pagamento retornado por GET /v1/payments/{id}. */
export interface MpPayment {
  id: number;
  status: string; // approved | pending | in_process | authorized | rejected | cancelled | refunded | charged_back
  status_detail?: string;
  external_reference?: string | null;
  transaction_amount: number;
  currency_id: string;
  payment_method_id?: string;
  payment_type_id?: string;
  date_approved?: string | null;
  collector_id?: number;
  live_mode?: boolean;
}
