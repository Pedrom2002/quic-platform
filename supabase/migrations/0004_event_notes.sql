CREATE TABLE event_notes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id       uuid REFERENCES team_members(id) ON DELETE SET NULL,
  content         text NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 10000),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
CREATE TRIGGER event_notes_updated_at BEFORE UPDATE ON event_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_event_notes_event ON event_notes(event_id);
CREATE INDEX idx_event_notes_org ON event_notes(organization_id);
ALTER TABLE event_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_read_own_org_notes" ON event_notes FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "members_insert_own_org_notes" ON event_notes FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_delete_own_org_notes" ON event_notes FOR DELETE USING (
  organization_id = get_user_org_id()
  AND (
    author_id IN (SELECT id FROM team_members WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM team_members WHERE auth_user_id = auth.uid() AND organization_id = event_notes.organization_id AND role IN ('admin','manager'))
  )
);
