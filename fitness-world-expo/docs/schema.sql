-- FITNESS WORLD EXPO — esquema de produção proposto (PostgreSQL / Supabase)
-- NÃO está conectado ao protótipo, que usa armazenamento local.
-- Reflete src/domain/types.ts e aplica isolamento por empresa com Row Level Security.

create extension if not exists pgcrypto;

-- Perfis e papéis --------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean language sql stable as $$
  select coalesce((select is_platform_admin from profiles where id = auth.uid()), false)
$$;

-- Temporadas --------------------------------------------------------------
create table seasons (
  id uuid primary key default gen_random_uuid(),
  number int not null unique,
  name text not null,
  theme text not null default '',
  description text not null default '',
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  daily_open time not null default '10:00',
  daily_close time not null default '22:00' check (daily_close > daily_open),
  status text not null default 'rascunho' check (status in ('rascunho', 'publicada')),
  is_active boolean not null default false
);

-- Marcas e membros --------------------------------------------------------
create table brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  segment text not null,
  description text not null default '',
  contact_email text not null,
  website text,
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'suspensa')),
  tier text not null default 'standard' check (tier in ('standard', 'premium', 'master')),
  slot_id text unique,                 -- posição no pavilhão (A1..B4)
  booth jsonb not null default '{}',   -- BoothConfig (arquitetura, cores, logotipo, telão...)
  created_at timestamptz not null default now()
);

create table brand_members (
  brand_id uuid references brands(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null default 'gestor' check (role in ('gestor', 'vendedor')),
  primary key (brand_id, user_id)
);

create or replace function is_brand_member(b uuid) returns boolean language sql stable as $$
  select exists (select 1 from brand_members where brand_id = b and user_id = auth.uid())
$$;

create table season_participations (
  season_id uuid references seasons(id) on delete cascade,
  brand_id uuid references brands(id) on delete cascade,
  tier text not null,
  fee numeric(12,2) not null,
  billing_status text not null default 'pendente',
  primary key (season_id, brand_id)
);

-- Catálogo ---------------------------------------------------------------
create table products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  name text not null,
  category text not null,
  shape text not null check (shape in ('pote', 'garrafa', 'caixa', 'refil', 'shaker')),
  color text not null,
  price numeric(12,2) not null check (price > 0),
  promo_price numeric(12,2) check (promo_price is null or promo_price < price),
  size text not null default '',
  description text not null default '',
  features text[] not null default '{}',
  in_stock boolean not null default true,
  is_launch boolean not null default false,
  featured boolean not null default true,
  model_url text                        -- GLB opcional enviado pela marca
);

-- Vendedores (pessoas reais) --------------------------------------------
create table sellers (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  user_id uuid references profiles(id),  -- conta da pessoa que atende
  name text not null,
  title text not null default '',
  languages text[] not null default '{Português}',
  bio text not null default '',
  avatar jsonb not null,
  active boolean not null default true
);

create table seller_shifts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers(id) on delete cascade,
  season_id uuid not null references seasons(id) on delete cascade,
  day int not null check (day >= 1),
  start_time time not null,
  end_time time not null check (end_time > start_time)
);

-- Programação e patrocínio ----------------------------------------------
create table schedule_events (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  brand_id uuid references brands(id),
  title text not null,
  type text not null check (type in ('lancamento', 'palestra', 'promocao', 'especial', 'competicao')),
  location text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  description text not null default ''
);

create table sponsors (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  name text not null,
  tier text not null check (tier in ('diamante', 'ouro', 'prata')),
  value numeric(12,2) not null,
  placements text[] not null default '{}',
  contract_status text not null default 'proposta' check (contract_status in ('proposta', 'assinado', 'cancelado'))
);

create table monetization_config (
  id int primary key default 1 check (id = 1),
  participation_fee jsonb not null,
  sponsorship_price jsonb not null,
  commission_rate numeric(5,2) not null,
  brand_commission_overrides jsonb not null default '{}'
);

create table ad_slots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null,
  price_per_day numeric(12,2) not null,
  advertiser text,
  message text not null default '',
  active boolean not null default true
);

-- Pedidos (um por marca) -------------------------------------------------
create table orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  brand_id uuid not null references brands(id),
  season_id uuid references seasons(id),
  buyer_id uuid references profiles(id),
  customer jsonb not null,
  subtotal numeric(12,2) not null,
  shipping numeric(12,2) not null,
  total numeric(12,2) not null,
  commission_rate numeric(5,2) not null,     -- congelado no momento da compra
  commission_value numeric(12,2) not null,
  payment_method text not null,
  payment_status text not null default 'pendente',
  payment_reference text,                    -- id no gateway
  status text not null default 'aguardando_marca'
    check (status in ('aguardando_marca', 'confirmado', 'enviado', 'entregue', 'cancelado')),
  created_at timestamptz not null default now()
);

create table order_lines (
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  name text not null,
  unit_price numeric(12,2) not null,
  qty int not null check (qty > 0)
);

-- Métricas ---------------------------------------------------------------
create table analytics_events (
  id bigserial primary key,
  type text not null,
  visitor_id text not null,
  brand_id uuid references brands(id),
  product_id uuid references products(id),
  seller_id uuid references sellers(id),
  season_id uuid references seasons(id),
  ts timestamptz not null default now()
);

-- RLS: cada empresa acessa somente os próprios dados ---------------------
alter table brands enable row level security;
alter table products enable row level security;
alter table sellers enable row level security;
alter table seller_shifts enable row level security;
alter table orders enable row level security;
alter table order_lines enable row level security;
alter table analytics_events enable row level security;

-- leitura pública do que aparece na feira
create policy brands_public_read on brands for select using (status = 'aprovada' or is_brand_member(id) or is_admin());
create policy products_public_read on products for select using (true);
create policy sellers_public_read on sellers for select using (active or is_brand_member(brand_id) or is_admin());

-- escrita restrita à própria marca (e ao administrador)
create policy brands_member_update on brands for update using (is_brand_member(id) or is_admin())
  with check (is_admin() or (status = (select status from brands b where b.id = brands.id) and slot_id is not distinct from (select slot_id from brands b where b.id = brands.id)));
create policy products_member_write on products for all using (is_brand_member(brand_id) or is_admin()) with check (is_brand_member(brand_id) or is_admin());
create policy sellers_member_write on sellers for all using (is_brand_member(brand_id) or is_admin()) with check (is_brand_member(brand_id) or is_admin());
create policy shifts_member_write on seller_shifts for all
  using (exists (select 1 from sellers s where s.id = seller_id and (is_brand_member(s.brand_id) or is_admin())));

-- pedidos e métricas: marca vê apenas os seus; comprador vê os próprios
create policy orders_read on orders for select using (is_brand_member(brand_id) or buyer_id = auth.uid() or is_admin());
create policy orders_brand_update on orders for update using (is_brand_member(brand_id) or is_admin());
create policy order_lines_read on order_lines for select
  using (exists (select 1 from orders o where o.id = order_id and (is_brand_member(o.brand_id) or o.buyer_id = auth.uid() or is_admin())));
create policy analytics_read on analytics_events for select using ((brand_id is not null and is_brand_member(brand_id)) or is_admin());
create policy analytics_insert on analytics_events for insert with check (true);
-- Criação de pedidos deve ocorrer apenas no servidor (função/edge function) após confirmação do gateway.
