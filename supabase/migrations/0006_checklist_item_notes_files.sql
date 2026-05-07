-- checklist_item_notes
CREATE TABLE checklist_item_notes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_item_id   uuid NOT NULL REFERENCES event_checklist_items(id) ON DELETE CASCADE,
  event_id            uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id           uuid REFERENCES team_members(id) ON DELETE SET NULL,
  content             text NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 10000),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);
CREATE TRIGGER checklist_item_notes_updated_at BEFORE UPDATE ON checklist_item_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_cin_item ON checklist_item_notes(checklist_item_id);
CREATE INDEX idx_cin_org  ON checklist_item_notes(organization_id);
ALTER TABLE checklist_item_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_read_cin"   ON checklist_item_notes FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "members_insert_cin" ON checklist_item_notes FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_delete_cin" ON checklist_item_notes FOR DELETE USING (
  organization_id = get_user_org_id()
  AND (
    author_id IN (SELECT id FROM team_members WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM team_members WHERE auth_user_id = auth.uid()
               AND organization_id = checklist_item_notes.organization_id
               AND role IN ('admin','manager'))
  )
);

-- checklist_item_files
CREATE TABLE checklist_item_files (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_item_id   uuid NOT NULL REFERENCES event_checklist_items(id) ON DELETE CASCADE,
  event_file_id       uuid NOT NULL REFERENCES event_files(id) ON DELETE CASCADE,
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  linked_by           uuid REFERENCES team_members(id) ON DELETE SET NULL,
  created_at          timestamptz DEFAULT now()
);
CREATE INDEX idx_cif_item ON checklist_item_files(checklist_item_id);
CREATE INDEX idx_cif_org  ON checklist_item_files(organization_id);
ALTER TABLE checklist_item_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_read_cif"   ON checklist_item_files FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "members_insert_cif" ON checklist_item_files FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_delete_cif" ON checklist_item_files FOR DELETE USING (organization_id = get_user_org_id());
