-- supabase/migrations/0002_contact_groups.sql

CREATE TABLE contact_groups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  color           text,
  icon            text,
  admin_only      boolean NOT NULL DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE contact_group_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid NOT NULL REFERENCES contact_groups(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (group_id, contact_id)
);

CREATE INDEX idx_contact_groups_org ON contact_groups (organization_id);
CREATE INDEX idx_contact_group_members_group ON contact_group_members (group_id);
CREATE INDEX idx_contact_group_members_contact ON contact_group_members (contact_id);
CREATE INDEX idx_contact_group_members_contact_group ON contact_group_members (contact_id, group_id);

CREATE TRIGGER contact_groups_updated_at BEFORE UPDATE ON contact_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
