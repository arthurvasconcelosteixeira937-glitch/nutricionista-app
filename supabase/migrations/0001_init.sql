-- =====================================================================
-- CobroSeguro — schema inicial
-- Regra de ouro: o vendedor (role "authenticated") só pode LER os próprios
-- dados. Toda escrita passa pelo servidor (service role), depois de validar
-- sessão e regras de negócio. Assim ninguém consegue marcar um cobro como
-- "pagado" pelo navegador, e a página pública /v/[code] é confiável.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Perfis dos vendedores (1:1 com auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  business_name text,
  whatsapp text,                         -- formato E.164: +52XXXXXXXXXX
  onboarding_completed boolean not null default false,
  reminders_enabled boolean not null default true,  -- liga/desliga lembretes globalmente
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Assinatura do vendedor (camada BillingProvider)
-- ---------------------------------------------------------------------
create table public.subscriptions (
  seller_id uuid primary key references public.profiles(id) on delete cascade,
  provider text not null default 'manual',          -- 'manual' | 'stripe' | ...
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'inactive', 'canceled')),
  trial_ends_at timestamptz not null default (now() + interval '7 days'),
  current_period_end timestamptz,
  provider_customer_id text,
  provider_subscription_id text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Conta Mercado Pago conectada via OAuth (tokens CRIPTOGRAFADOS)
-- Sem nenhuma policy: só o service role acessa.
-- ---------------------------------------------------------------------
create table public.mp_accounts (
  seller_id uuid primary key references public.profiles(id) on delete cascade,
  mp_user_id text not null,
  access_token_enc text not null,
  refresh_token_enc text,
  public_key text,
  scope text,
  live_mode boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index mp_accounts_mp_user_id_idx on public.mp_accounts (mp_user_id);

-- ---------------------------------------------------------------------
-- Cobros
-- ---------------------------------------------------------------------
create table public.cobros (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  public_code text not null unique,                 -- aleatório, ~95 bits
  customer_name text not null check (char_length(customer_name) between 1 and 80),
  customer_phone text not null,                     -- +52XXXXXXXXXX
  amount numeric(12, 2) not null check (amount > 0 and amount <= 999999.99),
  currency text not null default 'MXN' check (currency = 'MXN'),
  description text not null check (char_length(description) between 1 and 200),
  due_at timestamptz,                               -- vencimento opcional
  status text not null default 'pendiente'
    check (status in ('pendiente', 'pagado', 'vencido', 'cancelado', 'reembolsado')),
  mp_preference_id text,
  checkout_url text,
  mp_payment_id text,
  paid_amount numeric(12, 2),
  paid_at timestamptz,
  payment_method text,                              -- oxxo, clabe (SPEI), visa...
  canceled_at timestamptz,
  reminders_enabled boolean not null default true,
  reminders_sent int not null default 0 check (reminders_sent >= 0),
  last_reminder_at timestamptz,
  seller_notified_at timestamptz,
  receipt_sent_at timestamptz,
  last_checked_at timestamptz,                      -- última conciliação com o MP
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cobros_seller_created_idx on public.cobros (seller_id, created_at desc);
create index cobros_status_idx on public.cobros (status);
create index cobros_seller_paid_idx on public.cobros (seller_id, paid_at) where status = 'pagado';

-- ---------------------------------------------------------------------
-- Pagamentos vistos no Mercado Pago (sempre confirmados via API)
-- ---------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  cobro_id uuid not null references public.cobros(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  mp_payment_id text not null unique,
  status text not null,
  status_detail text,
  payment_method_id text,
  payment_type_id text,
  amount numeric(12, 2),
  currency text,
  live_mode boolean,
  date_approved timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_cobro_idx on public.payments (cobro_id);

-- ---------------------------------------------------------------------
-- Idempotência do webhook (sem policies: só service role)
-- ---------------------------------------------------------------------
create table public.webhook_events (
  id bigint generated always as identity primary key,
  provider text not null default 'mercadopago',
  event_key text not null,
  topic text,
  data_id text,
  result text,
  received_at timestamptz not null default now(),
  unique (provider, event_key)
);

-- ---------------------------------------------------------------------
-- Registro das mensagens de WhatsApp
-- ---------------------------------------------------------------------
create table public.message_log (
  id bigint generated always as identity primary key,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  cobro_id uuid references public.cobros(id) on delete cascade,
  kind text not null,          -- cobro_nuevo | pago_confirmado_vendedor | recibo_cliente | recordatorio
  channel text not null,       -- cloud_api | manual
  to_phone text not null,
  status text not null,        -- sent | failed | manual_link
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);
create index message_log_cobro_idx on public.message_log (cobro_id);

-- ---------------------------------------------------------------------
-- Rate limit simples em Postgres (janela fixa)
-- ---------------------------------------------------------------------
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);

create or replace function public.rate_limit_hit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count int;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning count into v_count;

  -- limpeza oportunista de janelas antigas
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_count <= p_limit;   -- true = permitido
end;
$$;
revoke all on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;

-- ---------------------------------------------------------------------
-- Incremento atômico do contador de lembretes (respeita o máximo)
-- ---------------------------------------------------------------------
create or replace function public.claim_reminder(p_cobro_id uuid, p_max int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  update public.cobros
     set reminders_sent = reminders_sent + 1,
         last_reminder_at = now(),
         updated_at = now()
   where id = p_cobro_id
     and status = 'pendiente'
     and reminders_sent < p_max;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;
revoke all on function public.claim_reminder(uuid, int) from public, anon, authenticated;
grant execute on function public.claim_reminder(uuid, int) to service_role;

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger subscriptions_touch before update on public.subscriptions for each row execute function public.touch_updated_at();
create trigger mp_accounts_touch before update on public.mp_accounts for each row execute function public.touch_updated_at();
create trigger cobros_touch before update on public.cobros for each row execute function public.touch_updated_at();
create trigger payments_touch before update on public.payments for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Novo usuário → cria perfil + assinatura em trial de 7 dias
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, coalesce(new.email, ''));
  insert into public.subscriptions (seller_id, provider, status, trial_ends_at)
  values (new.id, 'manual', 'trialing', now() + interval '7 days');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.mp_accounts    enable row level security;
alter table public.cobros         enable row level security;
alter table public.payments       enable row level security;
alter table public.webhook_events enable row level security;
alter table public.message_log    enable row level security;
alter table public.rate_limits    enable row level security;

-- Somente leitura dos próprios dados. Nenhuma policy de insert/update/delete
-- para "authenticated" ou "anon" => essas operações são negadas.
create policy "profiles: ler o próprio" on public.profiles
  for select to authenticated using (id = auth.uid());

create policy "subscriptions: ler a própria" on public.subscriptions
  for select to authenticated using (seller_id = auth.uid());

create policy "cobros: ler os próprios" on public.cobros
  for select to authenticated using (seller_id = auth.uid());

create policy "payments: ler os próprios" on public.payments
  for select to authenticated using (seller_id = auth.uid());

create policy "message_log: ler os próprios" on public.message_log
  for select to authenticated using (seller_id = auth.uid());

-- mp_accounts, webhook_events e rate_limits: sem policies (bloqueado para clientes).

-- Defesa extra: retira privilégios de escrita dos papéis públicos.
revoke insert, update, delete on all tables in schema public from anon, authenticated;
revoke all on public.mp_accounts, public.webhook_events, public.rate_limits from anon, authenticated;
