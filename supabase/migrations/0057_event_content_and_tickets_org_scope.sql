-- Quic Platform: event_articles, event_reports, event_notes, event_files,
-- ticket_types passam a validar event_id na policy INSERT/UPDATE (0057)
-- Segue o padrao de 0040-0056: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).
--
-- Contexto: em todos os 5 casos a Server Action correspondente ja valida
-- ownership do evento antes do insert (cliping/actions.ts, reports/actions.ts,
-- notes/actions.ts, files/actions.ts, tickets/actions.ts) - o gap e so a RLS,
-- que so validava organization_id da propria linha, explorável via bypass total
-- da Server Action (browser console com anon key, lib/supabase/client.ts).

DROP POLICY IF EXISTS "members_insert_ea" ON event_articles;
CREATE POLICY "members_insert_ea" ON event_articles FOR INSERT WITH CHECK (
  organization_id = get_user_org_id()
  AND EXISTS (SELECT 1 FROM events e WHERE e.id = event_articles.event_id AND e.organization_id = event_articles.organization_id)
);

DROP POLICY IF EXISTS "members_insert_reports" ON event_reports;
CREATE POLICY "members_insert_reports" ON event_reports FOR INSERT TO authenticated WITH CHECK (
  organization_id = get_user_org_id()
  AND EXISTS (SELECT 1 FROM events e WHERE e.id = event_reports.event_id AND e.organization_id = event_reports.organization_id)
);

DROP POLICY IF EXISTS "members_insert_own_org_notes" ON event_notes;
CREATE POLICY "members_insert_own_org_notes" ON event_notes FOR INSERT WITH CHECK (
  organization_id = get_user_org_id()
  AND EXISTS (SELECT 1 FROM events e WHERE e.id = event_notes.event_id AND e.organization_id = event_notes.organization_id)
);

DROP POLICY IF EXISTS "members_insert_own_org_files" ON event_files;
CREATE POLICY "members_insert_own_org_files" ON event_files FOR INSERT WITH CHECK (
  organization_id = get_user_org_id()
  AND EXISTS (SELECT 1 FROM events e WHERE e.id = event_files.event_id AND e.organization_id = event_files.organization_id)
);

DROP POLICY IF EXISTS "members_manage_own_org_ticket_types" ON ticket_types;
CREATE POLICY "members_manage_own_org_ticket_types" ON ticket_types FOR ALL
  USING (organization_id = get_user_org_id())
  WITH CHECK (
    organization_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM events e WHERE e.id = ticket_types.event_id AND e.organization_id = ticket_types.organization_id)
  );
