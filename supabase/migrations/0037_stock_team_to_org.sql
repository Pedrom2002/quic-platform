-- =========================================================================
-- Migração: substitui o claim JWT app_metadata.stock_team pela função
-- is_stock_team(), baseada em team_members/role da organização Quic
-- (integração Stock-Plat -> quic-plat, sub-projeto 1: auth/RLS).
--
-- COPIADA do repositório Stock-Plat (supabase/migrations/0004_stock_team_to_org.sql)
-- para preservar o histórico de schema aqui. JÁ FOI APLICADA à base de dados
-- partilhada. Não reaplicar.
-- =========================================================================

create or replace function public.is_stock_team()
returns boolean as $$
  select exists (
    select 1 from public.team_members
    where auth_user_id = auth.uid()
      and organization_id = '00000000-0000-0000-0000-000000000001'
      and role in ('admin', 'manager')
      and is_active = true
  );
$$ language sql security definer stable;

-- -------------------------------------------------------------------------
-- stock_categories
-- -------------------------------------------------------------------------
drop policy if exists "stock team all" on public.stock_categories;
create policy "stock team all" on public.stock_categories
  for all to authenticated
  using (is_stock_team())
  with check (is_stock_team());

-- -------------------------------------------------------------------------
-- stock_materials
-- -------------------------------------------------------------------------
drop policy if exists "stock team all" on public.stock_materials;
create policy "stock team all" on public.stock_materials
  for all to authenticated
  using (is_stock_team())
  with check (is_stock_team());

-- -------------------------------------------------------------------------
-- stock_events
-- -------------------------------------------------------------------------
drop policy if exists "stock team all" on public.stock_events;
create policy "stock team all" on public.stock_events
  for all to authenticated
  using (is_stock_team())
  with check (is_stock_team());

-- -------------------------------------------------------------------------
-- stock_movements
-- -------------------------------------------------------------------------
drop policy if exists "stock team all" on public.stock_movements;
create policy "stock team all" on public.stock_movements
  for all to authenticated
  using (is_stock_team())
  with check (is_stock_team());

-- -------------------------------------------------------------------------
-- stock_quote_requests
-- -------------------------------------------------------------------------
drop policy if exists "stock team all" on public.stock_quote_requests;
create policy "stock team all" on public.stock_quote_requests
  for all to authenticated
  using (is_stock_team())
  with check (is_stock_team());

-- -------------------------------------------------------------------------
-- stock_quote_request_items
-- -------------------------------------------------------------------------
drop policy if exists "stock team all" on public.stock_quote_request_items;
create policy "stock team all" on public.stock_quote_request_items
  for all to authenticated
  using (is_stock_team())
  with check (is_stock_team());

-- -------------------------------------------------------------------------
-- stock_material_units
-- -------------------------------------------------------------------------
drop policy if exists "stock team all" on public.stock_material_units;
create policy "stock team all" on public.stock_material_units
  for all to authenticated
  using (is_stock_team())
  with check (is_stock_team());

-- -------------------------------------------------------------------------
-- stock_profiles (3 policies: select / insert / update)
-- -------------------------------------------------------------------------
drop policy if exists "stock team select profiles" on public.stock_profiles;
create policy "stock team select profiles" on public.stock_profiles
  for select to authenticated
  using (is_stock_team());

drop policy if exists "stock team insert own profile" on public.stock_profiles;
create policy "stock team insert own profile" on public.stock_profiles
  for insert to authenticated
  with check (
    id = auth.uid()
    and is_stock_team()
  );

drop policy if exists "stock team update own profile" on public.stock_profiles;
create policy "stock team update own profile" on public.stock_profiles
  for update to authenticated
  using (
    id = auth.uid()
    and is_stock_team()
  )
  with check (
    id = auth.uid()
    and is_stock_team()
  );

-- -------------------------------------------------------------------------
-- storage.objects (bucket 'materials'): insert / update / delete
-- -------------------------------------------------------------------------
drop policy if exists "stock team materials insert" on storage.objects;
create policy "stock team materials insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'materials'
    and is_stock_team()
  );

drop policy if exists "stock team materials update" on storage.objects;
create policy "stock team materials update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'materials'
    and is_stock_team()
  )
  with check (
    bucket_id = 'materials'
    and is_stock_team()
  );

drop policy if exists "stock team materials delete" on storage.objects;
create policy "stock team materials delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'materials'
    and is_stock_team()
  );
