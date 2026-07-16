-- Stock-Plat: migração de melhorias (0002_melhorias)
-- ATENÇÃO: projeto Supabase partilhado com quic-plat. Esta migração APENAS cria
-- objetos novos prefixados stock_* (funções, tabelas, índices).
-- Nunca altera nem remove objetos existentes.
--
-- COPIADA do repositório Stock-Plat (supabase/migrations/0002_melhorias.sql)
-- para preservar o histórico de schema aqui. JÁ FOI APLICADA à base de dados
-- partilhada. Não reaplicar. Ver README para contexto sobre a BD partilhada.
--
-- Aplicada via Management API (db push proibido: histórico de migrações partilhado).
-- Este ficheiro acumula SQL de várias fases do plano de melhorias.

-- =========================================================================
-- Fase A: RPC submissao de pedido (transacional + rate-limit)
--
-- Substitui os 2 inserts separados da server action por uma única função
-- atómica. security definer (dona = postgres) para ignorar RLS na escrita
-- interna; só escreve nas tabelas stock_quote_* e valida os inputs. Não expõe
-- qualquer leitura. Rate-limit por email (5/hora) e global (50/hora) trava
-- spam por POST direto à action.
-- =========================================================================

create or replace function public.stock_submit_quote(
  p_name text,
  p_email text,
  p_phone text,
  p_event_date date,
  p_message text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
  v_item jsonb;
  v_material_id uuid;
  v_qty int;
begin
  -- Rate-limit por email: máximo 5 pedidos na última hora.
  if (
    select count(*)
    from public.stock_quote_requests
    where email = p_email
      and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'rate_limit';
  end if;

  -- Rate-limit global: trava floods com emails diferentes (50/hora).
  if (
    select count(*)
    from public.stock_quote_requests
    where created_at > now() - interval '1 hour'
  ) >= 50 then
    raise exception 'rate_limit';
  end if;

  -- Validar items: não nulo e pelo menos 1 elemento.
  if p_items is null or jsonb_array_length(p_items) < 1 then
    raise exception 'invalid_items';
  end if;

  -- Validar cada elemento: materialId (uuid) + qty (int > 0) e material existe.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    begin
      v_material_id := (v_item ->> 'materialId')::uuid;
      v_qty := (v_item ->> 'qty')::int;
    exception when others then
      raise exception 'invalid_items';
    end;

    if v_material_id is null or v_qty is null or v_qty <= 0 then
      raise exception 'invalid_items';
    end if;

    if not exists (
      select 1 from public.stock_materials where id = v_material_id
    ) then
      raise exception 'invalid_items';
    end if;
  end loop;

  -- Inserir o pedido (id gerado por default).
  insert into public.stock_quote_requests (name, email, phone, event_date, message)
  values (p_name, p_email, p_phone, p_event_date, p_message)
  returning id into v_request_id;

  -- Inserir os items associados ao novo pedido.
  insert into public.stock_quote_request_items (request_id, material_id, quantity)
  select
    v_request_id,
    (elem ->> 'materialId')::uuid,
    (elem ->> 'qty')::int
  from jsonb_array_elements(p_items) as elem;

  return v_request_id;
end;
$$;

revoke execute on function public.stock_submit_quote(text, text, text, date, text, jsonb) from public;
grant execute on function public.stock_submit_quote(text, text, text, date, text, jsonb) to anon, authenticated;

-- =========================================================================
-- Fase D: perfis de utilizador (autor dos movimentos)
--
-- stock_movements.created_by guarda o uuid do utilizador mas o ledger não
-- mostra quem registou. stock_profiles regista display_name/email do próprio
-- utilizador da equipa (upsert feito pela app no layout protegido). Sem FK
-- direta de stock_movements para stock_profiles: o ledger faz 2 queries e
-- junta em memória (mesmo padrão da disponibilidade).
-- =========================================================================

create table public.stock_profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  email text,
  updated_at timestamptz not null default now()
);

alter table public.stock_profiles enable row level security;

-- SELECT: qualquer membro da equipa (claim stock_team) vê os perfis (para
-- resolver o autor no ledger).
create policy "stock team select profiles" on public.stock_profiles
  for select to authenticated
  using (((select (auth.jwt() -> 'app_metadata' ->> 'stock_team'))::boolean = true));

-- INSERT: só o próprio, e apenas equipa.
create policy "stock team insert own profile" on public.stock_profiles
  for insert to authenticated
  with check (
    id = (select auth.uid())
    and ((select (auth.jwt() -> 'app_metadata' ->> 'stock_team'))::boolean = true)
  );

-- UPDATE: só o próprio, e apenas equipa (upsert do próprio perfil).
create policy "stock team update own profile" on public.stock_profiles
  for update to authenticated
  using (
    id = (select auth.uid())
    and ((select (auth.jwt() -> 'app_metadata' ->> 'stock_team'))::boolean = true)
  )
  with check (
    id = (select auth.uid())
    and ((select (auth.jwt() -> 'app_metadata' ->> 'stock_team'))::boolean = true)
  );

-- =========================================================================
-- Fase E: indices de performance
--
-- As views de disponibilidade recalculam a soma do ledger inteiro a cada
-- consulta. Aceitável em escala pequena; estes índices aceleram os agregados
-- filtrados por material/tipo e as leituras do trigger, o catálogo e o
-- rate-limit dos pedidos, sem introduzir a complexidade de refresh de uma
-- vista materializada.
--
-- YAGNI: a materialização da disponibilidade (materialized view + refresh)
-- fica adiada até o ledger crescer o suficiente para os agregados dominarem;
-- por agora índices B-tree chegam.
-- =========================================================================

-- Agregados das views e leitura do trigger (soma filtrada por material/tipo).
create index if not exists stock_movements_material_id_idx
  on public.stock_movements (material_id);
create index if not exists stock_movements_material_id_type_idx
  on public.stock_movements (material_id, type);
-- Filtro por evento no ledger.
create index if not exists stock_movements_event_id_idx
  on public.stock_movements (event_id);
-- Catálogo público (where is_public and active).
create index if not exists stock_materials_active_is_public_idx
  on public.stock_materials (active, is_public);
-- Lista de pedidos por estado no admin.
create index if not exists stock_quote_requests_status_idx
  on public.stock_quote_requests (status);
-- Rate-limit por email na última hora (Fase A).
create index if not exists stock_quote_requests_email_created_at_idx
  on public.stock_quote_requests (email, created_at);
-- Itens de um pedido.
create index if not exists stock_quote_request_items_request_id_idx
  on public.stock_quote_request_items (request_id);
