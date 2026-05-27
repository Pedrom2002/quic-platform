-- =========================================================
-- Quic Platform - Event Cliping (articles per event)
-- =========================================================
CREATE TABLE event_articles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  url             text NOT NULL CHECK (url ~* '^https?://'),
  source          text CHECK (source IS NULL OR char_length(source) <= 120),
  created_by      uuid REFERENCES team_members(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER event_articles_updated_at BEFORE UPDATE ON event_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_event_articles_event ON event_articles(event_id, created_at DESC);
CREATE INDEX idx_event_articles_org   ON event_articles(organization_id);

ALTER TABLE event_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_read_ea"   ON event_articles FOR SELECT
  USING (organization_id = get_user_org_id());
CREATE POLICY "members_insert_ea" ON event_articles FOR INSERT
  WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_update_ea" ON event_articles FOR UPDATE
  USING (organization_id = get_user_org_id());
CREATE POLICY "members_delete_ea" ON event_articles FOR DELETE
  USING (organization_id = get_user_org_id());
