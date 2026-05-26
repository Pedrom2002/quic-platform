-- =========================================================
-- Quic Platform — Marketing email module
-- =========================================================

-- Enums
CREATE TYPE marketing_contact_status AS ENUM ('active', 'unsubscribed', 'bounced');
CREATE TYPE marketing_campaign_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'paused');
CREATE TYPE marketing_send_status AS ENUM ('pending', 'sent', 'opened', 'clicked', 'bounced', 'unsubscribed', 'failed');

-- SMTP credentials per team member (password AES-256 encrypted in app layer)
CREATE TABLE team_smtp_credentials (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host         text NOT NULL,
  port         integer NOT NULL DEFAULT 587,
  username     text NOT NULL,
  password_enc text NOT NULL,
  from_name    text NOT NULL,
  verified_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Contact lists
CREATE TABLE marketing_lists (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  created_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_count integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Contacts within a list
CREATE TABLE marketing_contacts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id          uuid NOT NULL REFERENCES marketing_lists(id) ON DELETE CASCADE,
  email            text NOT NULL,
  name             text,
  company          text,
  role             text,
  tags             text[] NOT NULL DEFAULT '{}',
  engagement_score integer NOT NULL DEFAULT 0,
  status           marketing_contact_status NOT NULL DEFAULT 'active',
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_id, email)
);

-- Campaigns
CREATE TABLE marketing_campaigns (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  list_id          uuid NOT NULL REFERENCES marketing_lists(id),
  created_by       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_template text NOT NULL,
  body_template    text NOT NULL,
  ai_objective     text,
  ai_personalize   boolean NOT NULL DEFAULT false,
  status           marketing_campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at     timestamptz,
  followup_enabled boolean NOT NULL DEFAULT false,
  followup_days    integer NOT NULL DEFAULT 3,
  followup_subject text,
  followup_body    text,
  followup_max     integer NOT NULL DEFAULT 2,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Individual sends (one row per contact per campaign)
CREATE TABLE marketing_sends (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      uuid NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  contact_id       uuid NOT NULL REFERENCES marketing_contacts(id) ON DELETE CASCADE,
  status           marketing_send_status NOT NULL DEFAULT 'pending',
  subject_rendered text,
  body_rendered    text,
  sent_at          timestamptz,
  opened_at        timestamptz,
  clicked_at       timestamptz,
  followup_count   integer NOT NULL DEFAULT 0,
  last_followup_at timestamptz,
  error            text,
  UNIQUE (campaign_id, contact_id)
);

-- Keep contact_count up to date
CREATE OR REPLACE FUNCTION update_list_contact_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE marketing_lists SET contact_count = contact_count + 1 WHERE id = NEW.list_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE marketing_lists SET contact_count = contact_count - 1 WHERE id = OLD.list_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_list_contact_count
AFTER INSERT OR DELETE ON marketing_contacts
FOR EACH ROW EXECUTE FUNCTION update_list_contact_count();

-- Indexes for common queries
CREATE INDEX idx_marketing_contacts_list ON marketing_contacts(list_id);
CREATE INDEX idx_marketing_sends_campaign ON marketing_sends(campaign_id);
CREATE INDEX idx_marketing_sends_status ON marketing_sends(status);
CREATE INDEX idx_marketing_sends_contact ON marketing_sends(contact_id);

-- RLS: only authenticated team members can access these tables
ALTER TABLE team_smtp_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_sends ENABLE ROW LEVEL SECURITY;

-- team_smtp_credentials: each member sees only their own row
CREATE POLICY "own smtp creds" ON team_smtp_credentials
  USING (user_id = auth.uid());

-- marketing_lists / contacts / campaigns / sends: all team members can read/write
CREATE POLICY "team access" ON marketing_lists FOR ALL USING (
  EXISTS (SELECT 1 FROM team_members WHERE auth_user_id = auth.uid())
);
CREATE POLICY "team access" ON marketing_contacts FOR ALL USING (
  EXISTS (SELECT 1 FROM team_members WHERE auth_user_id = auth.uid())
);
CREATE POLICY "team access" ON marketing_campaigns FOR ALL USING (
  EXISTS (SELECT 1 FROM team_members WHERE auth_user_id = auth.uid())
);
CREATE POLICY "team access" ON marketing_sends FOR ALL USING (
  EXISTS (SELECT 1 FROM team_members WHERE auth_user_id = auth.uid())
);

-- Engagement score RPC (used by tracking endpoints)
CREATE OR REPLACE FUNCTION marketing_increment_score(p_contact_id uuid, p_delta integer)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE marketing_contacts
  SET engagement_score = engagement_score + p_delta
  WHERE id = p_contact_id;
$$;
