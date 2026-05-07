-- event_tasks
CREATE TABLE event_tasks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id         uuid REFERENCES event_tasks(id) ON DELETE CASCADE,
  checklist_item_id uuid REFERENCES event_checklist_items(id) ON DELETE SET NULL,
  title             text NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 500),
  description       text,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped')),
  assigned_to       uuid REFERENCES team_members(id) ON DELETE SET NULL,
  due_at            timestamptz,
  position          integer NOT NULL DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);
CREATE TRIGGER event_tasks_updated_at BEFORE UPDATE ON event_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_et_event      ON event_tasks(event_id);
CREATE INDEX idx_et_org        ON event_tasks(organization_id);
CREATE INDEX idx_et_parent     ON event_tasks(parent_id);
CREATE INDEX idx_et_event_par  ON event_tasks(event_id, parent_id);
ALTER TABLE event_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_read_et" ON event_tasks FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "members_insert_et" ON event_tasks FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_update_et" ON event_tasks FOR UPDATE USING (organization_id = get_user_org_id());
CREATE POLICY "members_delete_et" ON event_tasks FOR DELETE USING (organization_id = get_user_org_id());

-- event_task_notes
CREATE TABLE event_task_notes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         uuid NOT NULL REFERENCES event_tasks(id) ON DELETE CASCADE,
  event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id       uuid REFERENCES team_members(id) ON DELETE SET NULL,
  content         text NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 10000),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
CREATE TRIGGER event_task_notes_updated_at BEFORE UPDATE ON event_task_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_etn_task ON event_task_notes(task_id);
CREATE INDEX idx_etn_org  ON event_task_notes(organization_id);
ALTER TABLE event_task_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_read_etn" ON event_task_notes FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "members_insert_etn" ON event_task_notes FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_delete_etn" ON event_task_notes FOR DELETE USING (
  organization_id = get_user_org_id()
  AND (
    author_id IN (SELECT id FROM team_members WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM team_members WHERE auth_user_id = auth.uid()
               AND organization_id = event_task_notes.organization_id
               AND role IN ('admin','manager'))
  )
);

-- event_task_files
CREATE TABLE event_task_files (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         uuid NOT NULL REFERENCES event_tasks(id) ON DELETE CASCADE,
  event_file_id   uuid NOT NULL REFERENCES event_files(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  linked_by       uuid REFERENCES team_members(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX idx_etf_task ON event_task_files(task_id);
CREATE INDEX idx_etf_org  ON event_task_files(organization_id);
ALTER TABLE event_task_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_read_etf" ON event_task_files FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "members_insert_etf" ON event_task_files FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_delete_etf" ON event_task_files FOR DELETE USING (organization_id = get_user_org_id());
