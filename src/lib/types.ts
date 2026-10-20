export type ServiceType =
  | "limpieza"
  | "jardineria"
  | "construccion"
  | "pintura"
  | "mudanzas"
  | "handyman"
  | "otro";

export type Language = "es" | "en";
export type Recurrence = "weekly" | "biweekly" | "monthly";
export type PaymentMethod = "zelle" | "venmo" | "cashapp" | "efectivo" | "cheque" | "otro";
export type Channel = "whatsapp" | "sms";
export type TemplateKey = "amigable" | "firme" | "ultimo";
export type JobStatus = "pendiente" | "atrasado" | "pagado";

export interface Profile {
  id: string;
  full_name: string;
  business_name: string;
  service_type: ServiceType | null;
  zelle: string | null;
  venmo: string | null;
  cashapp: string | null;
  accepts_cash: boolean;
  timezone: string;
  onboarded: boolean;
  trial_ends_at: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  language: Language;
  notes: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  client_id: string;
  description: string;
  amount: number;
  amount_paid: number;
  is_paid: boolean;
  service_date: string;
  due_date: string;
  recurrence: Recurrence | null;
  next_generated: boolean;
  series_id: string | null;
  paid_at: string | null;
  receipt_number: number | null;
  created_at: string;
}

export type ClientSummary = Pick<Client, "id" | "name" | "phone" | "language">;

export interface JobWithClient extends Job {
  client: ClientSummary;
}

export interface Payment {
  id: string;
  job_id: string;
  amount: number;
  method: PaymentMethod;
  paid_on: string;
  created_at: string;
}

export interface Reminder {
  id: string;
  client_id: string;
  job_ids: string[];
  channel: Channel;
  template: TemplateKey;
  language: Language;
  message: string;
  amount: number;
  sent_at: string;
}

export interface PaymentInfo {
  zelle: string | null;
  venmo: string | null;
  cashapp: string | null;
  accepts_cash: boolean;
}
