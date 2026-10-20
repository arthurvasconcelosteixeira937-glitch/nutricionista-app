-- =============================================================
-- Cóbralo — esquema inicial
-- Tablas: profiles, clients, jobs, payments, reminders_sent
-- Cada usuario solo puede ver y modificar sus propios datos (RLS).
-- =============================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------
-- PROFILES
-- -------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  business_name text not null default '',
  service_type text check (service_type in ('limpieza','jardineria','construccion','pintura','mudanzas','handyman','otro')),
  zelle text,
  venmo text,
  cashapp text,
  accepts_cash boolean not null default false,
  timezone text not null default 'America/New_York',
  onboarded boolean not null default false,
  -- Suscripción (solo la modifica el servidor con la service role)
  trial_ends_at timestamptz not null default (now() + interval '7 days'),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  subscription_status text,
  subscription_current_period_end timestamptz,
  receipt_counter integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_len check (char_length(full_name) <= 80),
  constraint profiles_business_name_len check (char_length(business_name) <= 80),
  constraint profiles_zelle_len check (zelle is null or char_length(zelle) <= 120),
  constraint profiles_venmo_len check (venmo is null or char_length(venmo) <= 40),
  constraint profiles_cashapp_len check (cashapp is null or char_length(cashapp) <= 40)
);

-- -------------------------------------------------------------
-- CLIENTS
-- -------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  phone text not null check (phone ~ '^\+1[2-9][0-9]{9}$'),
  address text check (address is null or char_length(address) <= 200),
  language text not null default 'es' check (language in ('es','en')),
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists clients_user_name_idx on public.clients (user_id, name);

-- -------------------------------------------------------------
-- JOBS
-- -------------------------------------------------------------
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  description text not null check (char_length(btrim(description)) between 1 and 120),
  amount numeric(10,2) not null check (amount > 0 and amount <= 1000000),
  amount_paid numeric(10,2) not null default 0 check (amount_paid >= 0),
  is_paid boolean generated always as (amount_paid >= amount) stored,
  service_date date not null,
  due_date date not null,
  recurrence text check (recurrence in ('weekly','biweekly','monthly')),
  next_generated boolean not null default false,
  series_id uuid,
  paid_at timestamptz,
  receipt_number integer,
  created_at timestamptz not null default now(),
  constraint jobs_due_after_service check (due_date >= service_date)
);
create index if not exists jobs_user_paid_due_idx on public.jobs (user_id, is_paid, due_date);
create index if not exists jobs_user_service_idx on public.jobs (user_id, service_date desc);
create index if not exists jobs_client_idx on public.jobs (client_id);
create index if not exists jobs_recurring_idx on public.jobs (user_id) where recurrence is not null and not next_generated;

-- -------------------------------------------------------------
-- PAYMENTS
-- -------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  method text not null check (method in ('zelle','venmo','cashapp','efectivo','cheque','otro')),
  paid_on date not null,
  created_at timestamptz not null default now()
);
create index if not exists payments_user_paid_on_idx on public.payments (user_id, paid_on);
create index if not exists payments_job_idx on public.payments (job_id);

-- -------------------------------------------------------------
-- REMINDERS_SENT (historial de cobros enviados)
-- -------------------------------------------------------------
create table if not exists public.reminders_sent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  job_ids uuid[] not null default '{}',
  channel text not null check (channel in ('whatsapp','sms')),
  template text not null check (template in ('amigable','firme','ultimo')),
  language text not null check (language in ('es','en')),
  message text not null check (char_length(message) <= 4000),
  amount numeric(10,2) not null default 0,
  sent_at timestamptz not null default now()
);
create index if not exists reminders_client_idx on public.reminders_sent (client_id, sent_at desc);
create index if not exists reminders_job_ids_idx on public.reminders_sent using gin (job_ids);

-- =============================================================
-- FUNCIONES Y TRIGGERS
-- =============================================================

-- Crear el perfil cuando alguien se registra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 80))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at en profiles
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Estado de pago del trabajo: fecha de pago y número de recibo
create or replace function public.jobs_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.amount_paid >= new.amount then
    if new.paid_at is null then
      new.paid_at := now();
    end if;
    if new.receipt_number is null then
      update public.profiles
         set receipt_counter = receipt_counter + 1
       where id = new.user_id
      returning receipt_counter into new.receipt_number;
    end if;
  else
    new.paid_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists jobs_before_write on public.jobs;
create trigger jobs_before_write
  before insert or update on public.jobs
  for each row execute function public.jobs_before_write();

-- No permitir pagos mayores a lo que falta
create or replace function public.payments_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric(10,2);
begin
  select amount - amount_paid into v_balance
    from public.jobs
   where id = new.job_id and user_id = new.user_id
   for update;

  if v_balance is null then
    raise exception 'JOB_NOT_FOUND';
  end if;
  if new.amount > v_balance then
    raise exception 'PAYMENT_EXCEEDS_BALANCE';
  end if;
  return new;
end;
$$;

drop trigger if exists payments_before_insert on public.payments;
create trigger payments_before_insert
  before insert on public.payments
  for each row execute function public.payments_before_insert();

-- Mantener jobs.amount_paid = suma de pagos
create or replace function public.payments_sync_job()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job uuid := coalesce(new.job_id, old.job_id);
begin
  update public.jobs j
     set amount_paid = coalesce((select sum(p.amount) from public.payments p where p.job_id = v_job), 0)
   where j.id = v_job;
  return null;
end;
$$;

drop trigger if exists payments_sync_job on public.payments;
create trigger payments_sync_job
  after insert or update or delete on public.payments
  for each row execute function public.payments_sync_job();

-- Próxima fecha de un trabajo fijo. Para "mensual" se respeta el día original
-- de la serie (p_anchor_day): 31 ene → 28 feb → 31 mar.
create or replace function public.next_occurrence(p_date date, p_recurrence text, p_anchor_day integer default null)
returns date
language sql
immutable
as $$
  select case p_recurrence
    when 'weekly' then p_date + 7
    when 'biweekly' then p_date + 14
    when 'monthly' then (
      date_trunc('month', p_date) + interval '1 month'
      + make_interval(days => least(
          coalesce(p_anchor_day, extract(day from p_date)::int),
          extract(day from date_trunc('month', p_date) + interval '2 month' - interval '1 day')::int
        ) - 1)
    )::date
  end;
$$;

-- Crear los cobros de trabajos fijos que ya llegaron a su fecha.
-- Se llama desde la app con la fecha de hoy en la zona horaria del usuario.
create or replace function public.generate_recurring_jobs(p_today date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_today date;
  v_next date;
  v_count integer := 0;
  r record;
begin
  if v_uid is null then
    return 0;
  end if;
  -- Nunca crear cobros en el futuro lejano
  v_today := least(p_today, (now() at time zone 'utc')::date + 1);

  loop
    select j.*, extract(day from coalesce(root.service_date, j.service_date))::int as anchor_day
      into r
      from public.jobs j
      left join public.jobs root on root.id = j.series_id
     where j.user_id = v_uid
       and j.recurrence is not null
       and not j.next_generated
       and public.next_occurrence(j.service_date, j.recurrence,
             extract(day from coalesce(root.service_date, j.service_date))::int) <= v_today
     order by j.service_date
     limit 1
     for update of j skip locked;

    exit when not found or v_count >= 200;

    v_next := public.next_occurrence(r.service_date, r.recurrence, r.anchor_day);

    insert into public.jobs (user_id, client_id, description, amount, service_date, due_date, recurrence, series_id)
    values (r.user_id, r.client_id, r.description, r.amount, v_next,
            v_next + (r.due_date - r.service_date), r.recurrence, coalesce(r.series_id, r.id));

    update public.jobs set next_generated = true where id = r.id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.jobs enable row level security;
alter table public.payments enable row level security;
alter table public.reminders_sent enable row level security;

-- PROFILES: ver y editar solo el propio
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- CLIENTS
drop policy if exists "clients_select_own" on public.clients;
create policy "clients_select_own" on public.clients
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "clients_insert_own" on public.clients;
create policy "clients_insert_own" on public.clients
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "clients_update_own" on public.clients;
create policy "clients_update_own" on public.clients
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "clients_delete_own" on public.clients;
create policy "clients_delete_own" on public.clients
  for delete to authenticated using (user_id = auth.uid());

-- JOBS (el cliente también debe ser del usuario)
drop policy if exists "jobs_select_own" on public.jobs;
create policy "jobs_select_own" on public.jobs
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "jobs_insert_own" on public.jobs;
create policy "jobs_insert_own" on public.jobs
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.clients c where c.id = client_id and c.user_id = auth.uid())
  );

drop policy if exists "jobs_update_own" on public.jobs;
create policy "jobs_update_own" on public.jobs
  for update to authenticated using (user_id = auth.uid()) with check (
    user_id = auth.uid()
    and exists (select 1 from public.clients c where c.id = client_id and c.user_id = auth.uid())
  );

drop policy if exists "jobs_delete_own" on public.jobs;
create policy "jobs_delete_own" on public.jobs
  for delete to authenticated using (user_id = auth.uid());

-- PAYMENTS
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "payments_insert_own" on public.payments;
create policy "payments_insert_own" on public.payments
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.jobs j where j.id = job_id and j.user_id = auth.uid())
  );

drop policy if exists "payments_delete_own" on public.payments;
create policy "payments_delete_own" on public.payments
  for delete to authenticated using (user_id = auth.uid());

-- REMINDERS_SENT
drop policy if exists "reminders_select_own" on public.reminders_sent;
create policy "reminders_select_own" on public.reminders_sent
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "reminders_insert_own" on public.reminders_sent;
create policy "reminders_insert_own" on public.reminders_sent
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.clients c where c.id = client_id and c.user_id = auth.uid())
  );

-- =============================================================
-- PERMISOS POR COLUMNA
-- Los usuarios no pueden tocar columnas sensibles (suscripción,
-- montos pagados, números de recibo). Esas las maneja el servidor.
-- =============================================================
revoke all on public.profiles, public.clients, public.jobs, public.payments, public.reminders_sent from anon;
revoke all on public.profiles, public.clients, public.jobs, public.payments, public.reminders_sent from authenticated;

grant usage on schema public to authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, business_name, service_type, zelle, venmo, cashapp, accepts_cash, timezone, onboarded)
  on public.profiles to authenticated;

grant select, delete on public.clients to authenticated;
grant insert (name, phone, address, language, notes) on public.clients to authenticated;
grant update (name, phone, address, language, notes) on public.clients to authenticated;

grant select, delete on public.jobs to authenticated;
grant insert (client_id, description, amount, service_date, due_date, recurrence) on public.jobs to authenticated;
grant update (client_id, description, amount, service_date, due_date, recurrence) on public.jobs to authenticated;

grant select, delete on public.payments to authenticated;
grant insert (job_id, amount, method, paid_on) on public.payments to authenticated;

grant select on public.reminders_sent to authenticated;
grant insert (client_id, job_ids, channel, template, language, message, amount) on public.reminders_sent to authenticated;

grant all on public.profiles, public.clients, public.jobs, public.payments, public.reminders_sent to service_role;

revoke all on function public.generate_recurring_jobs(date) from public, anon;
grant execute on function public.generate_recurring_jobs(date) to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.jobs_before_write() from public, anon, authenticated;
revoke all on function public.payments_before_insert() from public, anon, authenticated;
revoke all on function public.payments_sync_job() from public, anon, authenticated;
