-- supabase/migrations/0019_event_raffles.sql

CREATE TABLE event_raffles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           text NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  description     text,
  prize           text,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  drawn_at        timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TRIGGER event_raffles_updated_at BEFORE UPDATE ON event_raffles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_er_event ON event_raffles(event_id);
CREATE INDEX idx_er_org   ON event_raffles(organization_id);

ALTER TABLE event_raffles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_read_er"   ON event_raffles FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "members_insert_er" ON event_raffles FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_update_er" ON event_raffles FOR UPDATE USING (organization_id = get_user_org_id());
CREATE POLICY "members_delete_er" ON event_raffles FOR DELETE USING (organization_id = get_user_org_id());

CREATE TABLE event_raffle_entries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id        uuid NOT NULL REFERENCES event_raffles(id) ON DELETE CASCADE,
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  participant_name text NOT NULL CHECK (char_length(participant_name) >= 1 AND char_length(participant_name) <= 200),
  is_winner        boolean NOT NULL DEFAULT false,
  drawn_at         timestamptz,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX idx_ere_raffle ON event_raffle_entries(raffle_id);
CREATE INDEX idx_ere_org    ON event_raffle_entries(organization_id);

ALTER TABLE event_raffle_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_read_ere"   ON event_raffle_entries FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "members_insert_ere" ON event_raffle_entries FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_update_ere" ON event_raffle_entries FOR UPDATE USING (organization_id = get_user_org_id());
CREATE POLICY "members_delete_ere" ON event_raffle_entries FOR DELETE USING (organization_id = get_user_org_id());
