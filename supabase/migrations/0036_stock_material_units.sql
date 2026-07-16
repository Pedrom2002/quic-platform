-- Stock-Plat: unidades individuais de material (0003_material_units)
-- ATENÇÃO: projeto Supabase partilhado com quic-plat. Apenas cria objetos
-- novos prefixados stock_*. Nunca altera objetos existentes.
--
-- COPIADA do repositório Stock-Plat (supabase/migrations/0003_material_units.sql)
-- para preservar o histórico de schema aqui. JÁ FOI APLICADA à base de dados
-- partilhada. Não reaplicar. Ver README para contexto sobre a BD partilhada.
--
-- Contexto: import do inventário do estúdio. Cada material agrupa por
-- descrição+categoria (quantity_total = nº de unidades) e cada unidade física
-- guarda os seus detalhes (código do inventário, nº de série, condição,
-- localização, estado).

-- =========================================================================
-- Tabela de unidades individuais
-- =========================================================================

create table public.stock_material_units (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.stock_materials on delete cascade,
  codigo text,
  serial_number text,
  condicao text,
  localizacao text,
  status text not null default 'Disponível',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists stock_material_units_material_id_idx
  on public.stock_material_units (material_id);

alter table public.stock_material_units enable row level security;

-- Equipa (claim stock_team) tem acesso total.
create policy "stock team all" on public.stock_material_units
  for all to authenticated
  using (((select (auth.jwt() -> 'app_metadata' ->> 'stock_team'))::boolean = true))
  with check (((select (auth.jwt() -> 'app_metadata' ->> 'stock_team'))::boolean = true));

-- anon NÃO tem acesso: os detalhes por unidade (nº de série, localização) são
-- internos; o catálogo público continua a expor apenas stock_catalog_materials.
