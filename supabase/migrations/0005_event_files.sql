CREATE TABLE event_files (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by     uuid REFERENCES team_members(id) ON DELETE SET NULL,
  file_name       text NOT NULL,
  file_size       bigint,
  mime_type       text,
  blob_url        text NOT NULL,
  blob_pathname   text NOT NULL,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX idx_event_files_event ON event_files(event_id);
CREATE INDEX idx_event_files_org ON event_files(organization_id);
ALTER TABLE event_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_read_own_org_files"   ON event_files FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "members_insert_own_org_files" ON event_files FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_delete_own_org_files" ON event_files FOR DELETE USING (organization_id = get_user_org_id());
