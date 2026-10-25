-- Aluno em Dia: estrutura inicial do banco
-- Regra geral: o navegador só LÊ os próprios dados (RLS).
-- Toda gravação passa pelas Edge Functions, que usam a service role.

-- Data de hoje no fuso de Brasília
create or replace function public.hoje_br() returns date
language sql stable as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

-- ---------------------------------------------------------------
-- Personal (dono da conta)
-- ---------------------------------------------------------------
create table public.personais (
  id                uuid primary key references auth.users (id) on delete cascade,
  nome              text not null,
  email             text not null,
  whatsapp          text not null,
  cpf_cnpj          text not null,
  tipo_empresa      text,
  nascimento        date,
  cep               text not null,
  endereco          text not null,
  numero            text not null,
  bairro            text not null,
  renda_mensal      numeric(12, 2) not null,
  -- Subconta Asaas do personal (recebe as mensalidades dos alunos)
  asaas_conta_id    text,
  asaas_wallet_id   text,
  -- Cliente e assinatura do personal na conta principal (R$ 29,90/mês)
  asaas_cliente_id  text,
  assinatura_id     text,
  teste_ate         date,
  criado_em         timestamptz not null default now()
);

-- Chave de API da subconta: só o servidor enxerga (RLS ligado e sem políticas)
create table public.personais_chaves (
  personal_id    uuid primary key references public.personais (id) on delete cascade,
  asaas_api_key  text not null,
  criado_em      timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Alunos e cobranças (mensalidades)
-- ---------------------------------------------------------------
create table public.alunos (
  id                    uuid primary key default gen_random_uuid(),
  personal_id           uuid not null references public.personais (id) on delete cascade,
  nome                  text not null,
  whatsapp              text not null,
  cpf                   text,
  valor                 numeric(10, 2) not null check (valor >= 5),
  dia_vencimento        smallint not null check (dia_vencimento between 1 and 28),
  asaas_cliente_id      text,
  asaas_assinatura_id   text unique,
  criado_em             timestamptz not null default now()
);
create index alunos_personal_idx on public.alunos (personal_id);

create table public.cobrancas (
  id                  uuid primary key default gen_random_uuid(),
  personal_id         uuid not null references public.personais (id) on delete cascade,
  aluno_id            uuid not null references public.alunos (id) on delete cascade,
  asaas_pagamento_id  text not null unique,
  valor               numeric(10, 2) not null,
  vencimento          date not null,
  status              text not null default 'aguardando'
                      check (status in ('aguardando', 'pago', 'atrasado', 'cancelado')),
  link                text,
  pago_em             date,
  atualizado_em       timestamptz not null default now()
);
create index cobrancas_personal_idx on public.cobrancas (personal_id, vencimento);
create index cobrancas_aluno_idx on public.cobrancas (aluno_id, vencimento);

-- ---------------------------------------------------------------
-- Assinatura do app (o personal paga R$ 29,90/mês para a conta principal)
-- ---------------------------------------------------------------
create table public.pagamentos_app (
  id                  uuid primary key default gen_random_uuid(),
  personal_id         uuid not null references public.personais (id) on delete cascade,
  asaas_pagamento_id  text not null unique,
  valor               numeric(10, 2) not null,
  vencimento          date not null,
  status              text not null default 'aguardando'
                      check (status in ('aguardando', 'pago', 'atrasado', 'cancelado')),
  link                text,
  atualizado_em       timestamptz not null default now()
);
create index pagamentos_app_personal_idx on public.pagamentos_app (personal_id, vencimento);

-- App bloqueado = alguma mensalidade do app vencida há mais de 5 dias
create or replace function public.app_bloqueado_para(p_personal uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.pagamentos_app
    where personal_id = p_personal
      and status in ('aguardando', 'atrasado')
      and vencimento < public.hoje_br() - 5
  )
$$;

create or replace function public.app_bloqueado() returns boolean
language sql stable security definer set search_path = public as $$
  select public.app_bloqueado_para(auth.uid())
$$;

revoke all on function public.app_bloqueado_para(uuid) from public, anon, authenticated;
revoke all on function public.app_bloqueado() from public, anon;
grant execute on function public.app_bloqueado() to authenticated;

-- ---------------------------------------------------------------
-- RLS: cada personal só vê o que é seu
-- ---------------------------------------------------------------
alter table public.personais        enable row level security;
alter table public.personais_chaves enable row level security;
alter table public.alunos           enable row level security;
alter table public.cobrancas        enable row level security;
alter table public.pagamentos_app   enable row level security;

create policy "personal vê o próprio cadastro" on public.personais
  for select to authenticated using (id = auth.uid());

create policy "personal vê os próprios alunos" on public.alunos
  for select to authenticated
  using (personal_id = auth.uid() and not public.app_bloqueado());

create policy "personal vê as próprias cobranças" on public.cobrancas
  for select to authenticated
  using (personal_id = auth.uid() and not public.app_bloqueado());

create policy "personal vê a própria assinatura" on public.pagamentos_app
  for select to authenticated using (personal_id = auth.uid());

-- Nenhum acesso do navegador à tabela de chaves
revoke all on public.personais_chaves from anon, authenticated;


-- Painel atualiza na hora quando o webhook grava um pagamento (respeita o RLS)
alter publication supabase_realtime add table public.cobrancas;
alter publication supabase_realtime add table public.pagamentos_app;
