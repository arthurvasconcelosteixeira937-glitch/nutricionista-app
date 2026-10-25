-- =============================================================
-- Tô em Dia — lista de espera (cadastros da página de venda)
-- Cole tudo no Supabase → SQL Editor → Run.
--
-- Segurança:
--  * Visitantes da página só conseguem INSERIR um cadastro. Não leem,
--    não alteram e não apagam nada.
--  * Só quem estiver na tabela "admins" (você) vê e edita os cadastros.
--  * Limite contra robôs: no máximo 30 cadastros por minuto no total e
--    um cadastro por número de WhatsApp.
-- =============================================================

create table if not exists public.leads (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  nome text not null check (char_length(btrim(nome)) between 1 and 60),
  whatsapp text not null unique check (whatsapp ~ '^55[1-9]{2}9[0-9]{8}$'),
  trabalho text check (trabalho is null or char_length(trabalho) <= 80),
  das_atrasado text check (das_atrasado is null or char_length(das_atrasado) <= 40),
  versao text check (versao in ('medo', 'calote', 'audio')),
  utm_source text check (utm_source is null or char_length(utm_source) <= 80),
  utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 120),
  utm_content text check (utm_content is null or char_length(utm_content) <= 120),
  chamado_em timestamptz,
  pagou_em timestamptz
);
create index if not exists leads_created_idx on public.leads (created_at desc);

-- Quem pode ver os cadastros (só você)
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Freio contra robôs: no máximo 30 cadastros por minuto
create or replace function public.leads_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.leads where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'RATE_LIMIT';
  end if;
  new.created_at := now();
  new.chamado_em := null;
  new.pagou_em := null;
  return new;
end;
$$;

drop trigger if exists leads_rate_limit on public.leads;
create trigger leads_rate_limit
  before insert on public.leads
  for each row execute function public.leads_rate_limit();

alter table public.leads enable row level security;
alter table public.admins enable row level security;

drop policy if exists "visitante cadastra" on public.leads;
create policy "visitante cadastra" on public.leads
  for insert to anon, authenticated with check (true);

drop policy if exists "admin ve" on public.leads;
create policy "admin ve" on public.leads
  for select to authenticated using (public.is_admin());

drop policy if exists "admin marca" on public.leads;
create policy "admin marca" on public.leads
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin apaga" on public.leads;
create policy "admin apaga" on public.leads
  for delete to authenticated using (public.is_admin());

drop policy if exists "admin se ve" on public.admins;
create policy "admin se ve" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- Permissões por coluna: o visitante só escreve os campos do formulário
revoke all on public.leads, public.admins from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant insert (nome, whatsapp, trabalho, das_atrasado, versao, utm_source, utm_campaign, utm_content)
  on public.leads to anon, authenticated;
grant select, delete on public.leads to authenticated;
grant update (chamado_em, pagou_em) on public.leads to authenticated;
grant select on public.admins to authenticated;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- =============================================================
-- DEPOIS de criar o seu usuário (Authentication → Users → Add user),
-- rode esta linha trocando pelo seu e-mail:
--
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'SEU-EMAIL@exemplo.com';
-- =============================================================
