-- Stock-Plat: migração inicial (0001_stock_init)
-- ATENÇÃO: projeto Supabase partilhado com quic-plat. Esta migração APENAS cria
-- objetos novos prefixados stock_* e o bucket de storage 'materials'.
-- Nunca altera nem remove objetos existentes.
--
-- COPIADA do repositório Stock-Plat (supabase/migrations/0001_stock_init.sql)
-- para preservar o histórico de schema aqui. JÁ FOI APLICADA à base de dados
-- partilhada (via SQL Editor / Management API, não via `supabase db push`,
-- que não é utilizável neste projeto por o histórico de migrações ser
-- partilhado). Não reaplicar. Ver README para contexto sobre a BD partilhada.

-- =========================================================================
-- 1. Tabelas
-- =========================================================================

create table public.stock_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0
);

create table public.stock_materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category_id uuid references public.stock_categories on delete restrict,
  unit text not null default 'un',
  quantity_total int not null default 0 check (quantity_total >= 0),
  photo_url text,
  is_public boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.stock_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_name text,
  starts_on date,
  ends_on date,
  status text not null default 'planeado'
    check (status in ('planeado', 'em_curso', 'concluido')),
  notes text,
  created_at timestamptz not null default now()
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.stock_materials on delete restrict,
  event_id uuid references public.stock_events on delete set null,
  type text not null check (type in ('saida', 'entrada', 'dano', 'ajuste')),
  quantity int not null,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  check (
    (type = 'ajuste' and quantity <> 0)
    or (type <> 'ajuste' and quantity > 0)
  )
);

create table public.stock_quote_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  event_date date,
  message text,
  status text not null default 'novo'
    check (status in ('novo', 'em_analise', 'respondido', 'fechado')),
  created_at timestamptz not null default now()
);

create table public.stock_quote_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.stock_quote_requests on delete cascade,
  material_id uuid not null references public.stock_materials on delete restrict,
  quantity int not null check (quantity > 0)
);

-- =========================================================================
-- 2. View interna de disponibilidade (security_invoker: respeita RLS de quem
--    consulta; destina-se apenas à equipa autenticada)
-- =========================================================================

create view public.stock_material_availability
with (security_invoker = true)
as
select
  m.id as material_id,
  m.quantity_total
    - coalesce(sum(mv.quantity) filter (where mv.type = 'saida'), 0)
    + coalesce(sum(mv.quantity) filter (where mv.type = 'entrada'), 0)
    - coalesce(sum(mv.quantity) filter (where mv.type = 'dano'), 0)
    + coalesce(sum(mv.quantity) filter (where mv.type = 'ajuste'), 0)
    as disponivel
from public.stock_materials m
left join public.stock_movements mv on mv.material_id = m.id
group by m.id, m.quantity_total;

-- =========================================================================
-- 3. Trigger: bloquear saída acima do disponível
--    SECURITY DEFINER com search_path fixo: garante que o cálculo de
--    disponibilidade vê todos os movimentos independentemente das políticas
--    RLS do utilizador que insere (defesa consistente).
-- =========================================================================

create function public.stock_check_saida()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_disponivel int;
begin
  if new.type = 'saida' then
    select av.disponivel
      into v_disponivel
    from public.stock_material_availability av
    where av.material_id = new.material_id;

    if new.quantity > coalesce(v_disponivel, 0) then
      raise exception 'stock insuficiente: disponivel %', coalesce(v_disponivel, 0);
    end if;
  end if;
  return new;
end;
$$;

create trigger stock_check_saida_before_insert
  before insert on public.stock_movements
  for each row
  execute function public.stock_check_saida();

-- =========================================================================
-- 4. View pública do catálogo (semântica definer, SEM security_invoker:
--    anon lê a view sem precisar de SELECT em stock_movements; a
--    disponibilidade é calculada inline a partir de stock_movements e só é
--    exposta como booleano 'available'). Apenas colunas públicas.
-- =========================================================================

create view public.stock_catalog_materials as
select
  m.id,
  m.name,
  m.description,
  m.category_id,
  m.unit,
  m.photo_url,
  (
    m.quantity_total
      - coalesce(sum(mv.quantity) filter (where mv.type = 'saida'), 0)
      + coalesce(sum(mv.quantity) filter (where mv.type = 'entrada'), 0)
      - coalesce(sum(mv.quantity) filter (where mv.type = 'dano'), 0)
      + coalesce(sum(mv.quantity) filter (where mv.type = 'ajuste'), 0)
  ) > 0 as available
from public.stock_materials m
left join public.stock_movements mv on mv.material_id = m.id
where m.is_public = true and m.active = true
group by m.id;

-- =========================================================================
-- 5. RLS
--    Equipa = utilizador autenticado com claim app_metadata.stock_team = true
--    (auth.users é partilhado com o quic-plat; autenticado simples NÃO basta).
-- =========================================================================

alter table public.stock_categories enable row level security;
alter table public.stock_materials enable row level security;
alter table public.stock_events enable row level security;
alter table public.stock_movements enable row level security;
alter table public.stock_quote_requests enable row level security;
alter table public.stock_quote_request_items enable row level security;

-- Políticas da equipa (claim stock_team)

create policy "stock team all" on public.stock_categories
  for all to authenticated
  using (((select (auth.jwt() -> 'app_metadata' ->> 'stock_team'))::boolean = true))
  with check (((select (auth.jwt() -> 'app_metadata' ->> 'stock_team'))::boolean = true));

create policy "stock team all" on public.stock_materials
  for all to authenticated
  using (((select (auth.jwt() -> 'app_metadata' ->> 'stock_team'))::boolean = true))
  with check (((select (auth.jwt() -> 'app_metadata' ->> 'stock_team'))::boolean = true));

create policy "stock team all" on public.stock_events
  for all to authenticated
  using (((select (auth.jwt() -> 'app_metadata' ->> 'stock_team'))::boolean = true))
  with check (((select (auth.jwt() -> 'app_metadata' ->> 'stock_team'))::boolean = true));

create policy "stock team all" on public.stock_movements
  for all to authenticated
  using (((select (auth.jwt() -> 'app_metadata' ->> 'stock_team'))::boolean = true))
  with check (((select (auth.jwt() -> 'app_metadata' ->> 'stock_team'))::boolean = true));

create policy "stock team all" on public.stock_quote_requests
  for all to authenticated
  using (((select (auth.jwt() -> 'app_metadata' ->> 'stock_team'))::boolean = true))
  with check (((select (auth.jwt() -> 'app_metadata' ->> 'stock_team'))::boolean = true));

create policy "stock team all" on public.stock_quote_request_items
  for all to authenticated
  using (((select (auth.jwt() -> 'app_metadata' ->> 'stock_team'))::boolean = true))
  with check (((select (auth.jwt() -> 'app_metadata' ->> 'stock_team'))::boolean = true));

-- Políticas anon (catálogo público + submissão de pedidos de orçamento)

create policy "stock anon select categories" on public.stock_categories
  for select to anon
  using (true);

create policy "stock anon select public materials" on public.stock_materials
  for select to anon
  using (is_public = true and active = true);

create policy "stock anon insert quote requests" on public.stock_quote_requests
  for insert to anon
  with check (true);

create policy "stock anon insert quote request items" on public.stock_quote_request_items
  for insert to anon
  with check (true);

-- =========================================================================
-- 6. Grants nas views
-- =========================================================================

revoke select on public.stock_material_availability from anon;
grant select on public.stock_material_availability to authenticated;
grant select on public.stock_catalog_materials to anon, authenticated;

-- =========================================================================
-- 7. Storage: bucket público 'materials' (leitura pública; escrita apenas
--    equipa com claim stock_team). Sem política SELECT: bucket é público.
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('materials', 'materials', true)
on conflict (id) do nothing;

create policy "stock team materials insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'materials'
    and ((select (auth.jwt() -> 'app_metadata' ->> 'stock_team'))::boolean = true)
  );

create policy "stock team materials update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'materials'
    and ((select (auth.jwt() -> 'app_metadata' ->> 'stock_team'))::boolean = true)
  )
  with check (
    bucket_id = 'materials'
    and ((select (auth.jwt() -> 'app_metadata' ->> 'stock_team'))::boolean = true)
  );

create policy "stock team materials delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'materials'
    and ((select (auth.jwt() -> 'app_metadata' ->> 'stock_team'))::boolean = true)
  );

-- =========================================================================
-- 8. Seed: categorias iniciais
-- =========================================================================

insert into public.stock_categories (name, sort_order) values
  ('Som', 1),
  ('Luz', 2),
  ('Palco', 3),
  ('Vídeo', 4),
  ('Decoração', 5),
  ('Cabos', 6),
  ('Outros', 7);
