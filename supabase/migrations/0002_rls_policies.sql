-- =========================================================
-- Quic Platform — Row Level Security Policies
-- =========================================================

-- Helper: obter organization_id do utilizador autenticado
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS uuid AS $$
  SELECT organization_id FROM team_members
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =========================================================
-- ORGANIZATIONS
-- =========================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_see_own_org" ON organizations
  FOR ALL USING (id = get_user_org_id());

-- =========================================================
-- TEAM MEMBERS
-- =========================================================
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_see_own_org_team" ON team_members
  FOR ALL USING (organization_id = get_user_org_id());

-- =========================================================
-- EVENT TYPES
-- =========================================================
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_see_own_org_event_types" ON event_types
  FOR ALL USING (organization_id = get_user_org_id());

-- =========================================================
-- CHECKLIST TEMPLATES
-- =========================================================
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_see_own_org_templates" ON checklist_templates
  FOR ALL USING (organization_id = get_user_org_id());

ALTER TABLE checklist_template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_see_template_items" ON checklist_template_items
  FOR ALL USING (
    template_id IN (
      SELECT id FROM checklist_templates WHERE organization_id = get_user_org_id()
    )
  );

-- =========================================================
-- MESSAGE TEMPLATES
-- =========================================================
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_see_own_org_msg_templates" ON message_templates
  FOR ALL USING (organization_id = get_user_org_id());

-- =========================================================
-- EVENTS
-- =========================================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_see_own_org_events" ON events
  FOR ALL USING (organization_id = get_user_org_id());

-- Portal: acesso read-only por token (sem auth, via service role no API route)
-- A verificação do portal_token é feita no Next.js API route com service role key

-- =========================================================
-- EVENT TEAM ASSIGNMENTS
-- =========================================================
ALTER TABLE event_team_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_see_event_assignments" ON event_team_assignments
  FOR ALL USING (
    event_id IN (
      SELECT id FROM events WHERE organization_id = get_user_org_id()
    )
  );

-- =========================================================
-- CLIENTS
-- =========================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_see_own_org_clients" ON clients
  FOR ALL USING (organization_id = get_user_org_id());

-- =========================================================
-- EVENT CLIENTS
-- =========================================================
ALTER TABLE event_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_see_event_clients" ON event_clients
  FOR ALL USING (
    event_id IN (
      SELECT id FROM events WHERE organization_id = get_user_org_id()
    )
  );

-- =========================================================
-- EVENT CHECKLIST ITEMS
-- =========================================================
ALTER TABLE event_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_see_event_checklist" ON event_checklist_items
  FOR ALL USING (
    event_id IN (
      SELECT id FROM events WHERE organization_id = get_user_org_id()
    )
  );

-- =========================================================
-- NOTIFICATION JOBS
-- =========================================================
ALTER TABLE notification_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_see_event_notif_jobs" ON notification_jobs
  FOR ALL USING (
    event_id IN (
      SELECT id FROM events WHERE organization_id = get_user_org_id()
    )
  );

-- =========================================================
-- NOTIFICATION LOG
-- =========================================================
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_see_notif_log" ON notification_log
  FOR ALL USING (
    notification_job_id IN (
      SELECT nj.id FROM notification_jobs nj
      JOIN events e ON e.id = nj.event_id
      WHERE e.organization_id = get_user_org_id()
    )
  );

-- =========================================================
-- WEBHOOK EVENTS (apenas service role escreve)
-- =========================================================
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
-- Sem políticas para authenticated — apenas service_role acede a esta tabela
