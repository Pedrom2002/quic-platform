-- Consolidated hardening pass, closes several HIGH/MEDIUM audit findings:
--
-- 1) SET search_path on every SECURITY DEFINER function that was missing it
--    (get_user_org_id, marketing_increment_score, marketing_check_warmup_limit,
--    marketing_record_send, is_stock_team), matching the convention already
--    used correctly by newer functions (stock_check_saida, check_in_ticket,
--    list_contacts_page). get_user_org_id() in particular backs nearly every
--    RLS policy in the schema, so this is the highest-value one to close.
--
-- 2) marketing_increment_score had no explicit REVOKE/GRANT, so it kept
--    Postgres's default EXECUTE-to-PUBLIC. It's reachable from public
--    tracking endpoints with a fully caller-controlled p_contact_id and
--    p_delta and no correlation check to a real send, letting anyone
--    inflate/deflate any contact's engagement score. Lock it down to
--    match the other public-tracking-callable functions.
--
-- 3) Stock RLS policies called is_stock_team() unwrapped, so Postgres
--    re-evaluates it (a query against team_members) once per row scanned
--    instead of once per query. Wrapping in (select ...) restores the
--    single-evaluation initplan behavior the original stock_team_id claim
--    check had before the 0037 migration replaced it.
--
-- 4) event_tasks / event_raffles / event_raffle_entries UPDATE policies
--    relied on Postgres's implicit fallback (reusing USING as the check)
--    instead of an explicit WITH CHECK. Not exploitable today, but making
--    it explicit avoids relying on that fallback in a future refactor.

-- ---- 1) search_path hardening ----

CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id FROM team_members
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

ALTER FUNCTION marketing_increment_score(uuid, integer) SET search_path = public;
ALTER FUNCTION marketing_check_warmup_limit(uuid) SET search_path = public;
ALTER FUNCTION marketing_record_send(uuid) SET search_path = public;
ALTER FUNCTION is_stock_team() SET search_path = public;

-- ---- 2) lock down marketing_increment_score ----

REVOKE ALL ON FUNCTION marketing_increment_score(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION marketing_increment_score(uuid, integer) TO anon, authenticated;

-- ---- 3) wrap is_stock_team() calls in (select ...) for single evaluation ----

DROP POLICY IF EXISTS "stock team all" ON public.stock_categories;
CREATE POLICY "stock team all" ON public.stock_categories
  FOR ALL TO authenticated
  USING ((SELECT is_stock_team()))
  WITH CHECK ((SELECT is_stock_team()));

DROP POLICY IF EXISTS "stock team all" ON public.stock_materials;
CREATE POLICY "stock team all" ON public.stock_materials
  FOR ALL TO authenticated
  USING ((SELECT is_stock_team()))
  WITH CHECK ((SELECT is_stock_team()));

DROP POLICY IF EXISTS "stock team all" ON public.stock_events;
CREATE POLICY "stock team all" ON public.stock_events
  FOR ALL TO authenticated
  USING ((SELECT is_stock_team()))
  WITH CHECK ((SELECT is_stock_team()));

DROP POLICY IF EXISTS "stock team all" ON public.stock_movements;
CREATE POLICY "stock team all" ON public.stock_movements
  FOR ALL TO authenticated
  USING ((SELECT is_stock_team()))
  WITH CHECK ((SELECT is_stock_team()));

DROP POLICY IF EXISTS "stock team all" ON public.stock_quote_requests;
CREATE POLICY "stock team all" ON public.stock_quote_requests
  FOR ALL TO authenticated
  USING ((SELECT is_stock_team()))
  WITH CHECK ((SELECT is_stock_team()));

DROP POLICY IF EXISTS "stock team all" ON public.stock_quote_request_items;
CREATE POLICY "stock team all" ON public.stock_quote_request_items
  FOR ALL TO authenticated
  USING ((SELECT is_stock_team()))
  WITH CHECK ((SELECT is_stock_team()));

DROP POLICY IF EXISTS "stock team all" ON public.stock_material_units;
CREATE POLICY "stock team all" ON public.stock_material_units
  FOR ALL TO authenticated
  USING ((SELECT is_stock_team()))
  WITH CHECK ((SELECT is_stock_team()));

DROP POLICY IF EXISTS "stock team select profiles" ON public.stock_profiles;
CREATE POLICY "stock team select profiles" ON public.stock_profiles
  FOR SELECT TO authenticated
  USING ((SELECT is_stock_team()));

DROP POLICY IF EXISTS "stock team insert own profile" ON public.stock_profiles;
CREATE POLICY "stock team insert own profile" ON public.stock_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND (SELECT is_stock_team())
  );

DROP POLICY IF EXISTS "stock team update own profile" ON public.stock_profiles;
CREATE POLICY "stock team update own profile" ON public.stock_profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    AND (SELECT is_stock_team())
  )
  WITH CHECK (
    id = auth.uid()
    AND (SELECT is_stock_team())
  );

DROP POLICY IF EXISTS "stock team materials insert" ON storage.objects;
CREATE POLICY "stock team materials insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'materials'
    AND (SELECT is_stock_team())
  );

DROP POLICY IF EXISTS "stock team materials update" ON storage.objects;
CREATE POLICY "stock team materials update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'materials'
    AND (SELECT is_stock_team())
  )
  WITH CHECK (
    bucket_id = 'materials'
    AND (SELECT is_stock_team())
  );

DROP POLICY IF EXISTS "stock team materials delete" ON storage.objects;
CREATE POLICY "stock team materials delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'materials'
    AND (SELECT is_stock_team())
  );

-- ---- 4) explicit WITH CHECK on UPDATE policies ----

DROP POLICY IF EXISTS "members_update_et" ON event_tasks;
CREATE POLICY "members_update_et" ON event_tasks
  FOR UPDATE
  USING (organization_id = get_user_org_id())
  WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "members_update_er" ON event_raffles;
CREATE POLICY "members_update_er" ON event_raffles
  FOR UPDATE
  USING (organization_id = get_user_org_id())
  WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "members_update_ere" ON event_raffle_entries;
CREATE POLICY "members_update_ere" ON event_raffle_entries
  FOR UPDATE
  USING (organization_id = get_user_org_id())
  WITH CHECK (organization_id = get_user_org_id());
