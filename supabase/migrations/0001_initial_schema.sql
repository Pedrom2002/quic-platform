-- =========================================================
-- Quic Platform — Schema Inicial
-- =========================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- ORGANIZAÇÕES
-- =========================================================
CREATE TABLE organizations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text UNIQUE NOT NULL,
  logo_url      text,
  settings      jsonb DEFAULT '{}',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =========================================================
-- MEMBROS DA EQUIPA (ligados ao Supabase Auth)
-- =========================================================
CREATE TABLE team_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  auth_user_id    uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name       text NOT NULL,
  email           text UNIQUE NOT NULL,
  role            text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
  avatar_url      text,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
CREATE TRIGGER team_members_updated_at BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_team_members_org ON team_members(organization_id);
CREATE INDEX idx_team_members_auth ON team_members(auth_user_id);

-- =========================================================
-- TIPOS DE EVENTO
-- =========================================================
CREATE TABLE event_types (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  slug            text NOT NULL,
  description     text,
  color           text DEFAULT '#6366f1',
  icon            text DEFAULT 'calendar',
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(organization_id, slug)
);
CREATE TRIGGER event_types_updated_at BEFORE UPDATE ON event_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =========================================================
-- TEMPLATES DE CHECKLIST
-- =========================================================
CREATE TABLE checklist_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type_id   uuid NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
  name            text NOT NULL,
  version         integer NOT NULL DEFAULT 1,
  is_active       boolean DEFAULT true,
  created_by      uuid REFERENCES team_members(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
CREATE TRIGGER checklist_templates_updated_at BEFORE UPDATE ON checklist_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_checklist_templates_org ON checklist_templates(organization_id);
CREATE INDEX idx_checklist_templates_type ON checklist_templates(event_type_id);

-- =========================================================
-- ITENS DO TEMPLATE
-- =========================================================
CREATE TABLE checklist_template_items (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id                  uuid NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  parent_item_id               uuid REFERENCES checklist_template_items(id) ON DELETE CASCADE,
  title                        text NOT NULL,
  description                  text,
  position                     integer NOT NULL,
  is_client_visible            boolean DEFAULT true,
  client_label                 text,
  estimated_duration_h         numeric(5,2),
  default_notification_rules   jsonb DEFAULT '[]',
  created_at                   timestamptz DEFAULT now(),
  updated_at                   timestamptz DEFAULT now()
);
CREATE TRIGGER checklist_template_items_updated_at BEFORE UPDATE ON checklist_template_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_template_items_template ON checklist_template_items(template_id);

-- =========================================================
-- TEMPLATES DE MENSAGEM
-- =========================================================
CREATE TABLE message_templates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  channel               text NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms', 'portal')),
  language              text NOT NULL DEFAULT 'pt',
  subject               text,
  body_template         text NOT NULL,
  whatsapp_template_id  text,
  is_active             boolean DEFAULT true,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);
CREATE TRIGGER message_templates_updated_at BEFORE UPDATE ON message_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =========================================================
-- EVENTOS
-- =========================================================
CREATE TABLE events (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type_id            uuid NOT NULL REFERENCES event_types(id),
  name                     text NOT NULL,
  slug                     text NOT NULL,
  description              text,
  venue_name               text,
  venue_address            text,
  start_datetime           timestamptz NOT NULL,
  end_datetime             timestamptz NOT NULL,
  status                   text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
  portal_token             text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  portal_token_expires_at  timestamptz,
  settings                 jsonb DEFAULT '{}',
  created_by               uuid REFERENCES team_members(id) ON DELETE SET NULL,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now(),
  UNIQUE(organization_id, slug)
);
CREATE TRIGGER events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_events_org ON events(organization_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_portal_token ON events(portal_token);

-- =========================================================
-- EQUIPA POR EVENTO
-- =========================================================
CREATE TABLE event_team_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_member_id  uuid NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  role_in_event   text,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(event_id, team_member_id)
);
CREATE INDEX idx_event_team_event ON event_team_assignments(event_id);

-- =========================================================
-- CLIENTES
-- =========================================================
CREATE TABLE clients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name       text NOT NULL,
  email           text,
  phone           text,
  whatsapp        text,
  company         text,
  notes           text,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_clients_org ON clients(organization_id);

-- =========================================================
-- CLIENTES POR EVENTO
-- =========================================================
CREATE TABLE event_clients (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id           uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  role                text DEFAULT 'primary_contact' CHECK (role IN ('primary_contact', 'cc', 'vip', 'vendor')),
  notification_prefs  jsonb DEFAULT '{"channels": ["email", "portal"], "language": "pt"}',
  opted_out           boolean DEFAULT false,
  opted_out_at        timestamptz,
  created_at          timestamptz DEFAULT now(),
  UNIQUE(event_id, client_id)
);
CREATE INDEX idx_event_clients_event ON event_clients(event_id);
CREATE INDEX idx_event_clients_client ON event_clients(client_id);

-- =========================================================
-- CHECKLIST LIVE POR EVENTO
-- =========================================================
CREATE TABLE event_checklist_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  template_item_id    uuid REFERENCES checklist_template_items(id) ON DELETE SET NULL,
  parent_item_id      uuid REFERENCES event_checklist_items(id) ON DELETE CASCADE,
  title               text NOT NULL,
  description         text,
  client_label        text,
  position            integer NOT NULL,
  is_client_visible   boolean DEFAULT true,
  status              text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  assigned_to         uuid REFERENCES team_members(id) ON DELETE SET NULL,
  due_at              timestamptz,
  started_at          timestamptz,
  completed_at        timestamptz,
  completed_by        uuid REFERENCES team_members(id) ON DELETE SET NULL,
  completion_note     text,
  notification_rules  jsonb DEFAULT '[]',
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);
CREATE TRIGGER event_checklist_items_updated_at BEFORE UPDATE ON event_checklist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_checklist_items_event ON event_checklist_items(event_id);
CREATE INDEX idx_checklist_items_status ON event_checklist_items(event_id, status);

-- =========================================================
-- FILA DE NOTIFICAÇÕES
-- =========================================================
CREATE TABLE notification_jobs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  checklist_item_id     uuid REFERENCES event_checklist_items(id) ON DELETE SET NULL,
  client_id             uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  channel               text NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms', 'portal')),
  message_template_id   uuid REFERENCES message_templates(id) ON DELETE SET NULL,
  rendered_subject      text,
  rendered_body         text NOT NULL,
  status                text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'cancelled')),
  scheduled_at          timestamptz DEFAULT now(),
  sent_at               timestamptz,
  qstash_message_id     text,
  attempt_count         integer DEFAULT 0,
  last_error            text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);
CREATE TRIGGER notification_jobs_updated_at BEFORE UPDATE ON notification_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_notification_jobs_status ON notification_jobs(status, scheduled_at);
CREATE INDEX idx_notification_jobs_event ON notification_jobs(event_id);

-- =========================================================
-- LOG DE ENTREGA (audit trail)
-- =========================================================
CREATE TABLE notification_log (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_job_id   uuid NOT NULL REFERENCES notification_jobs(id) ON DELETE CASCADE,
  event_at              timestamptz NOT NULL DEFAULT now(),
  event_type            text NOT NULL CHECK (event_type IN ('queued', 'sent', 'delivered', 'opened', 'bounced', 'failed')),
  channel               text NOT NULL,
  provider              text,
  provider_message_id   text,
  metadata              jsonb DEFAULT '{}'
);
CREATE INDEX idx_notification_log_job ON notification_log(notification_job_id);
CREATE INDEX idx_notification_log_event ON notification_log(event_at);

-- =========================================================
-- WEBHOOKS RECEBIDOS
-- =========================================================
CREATE TABLE webhook_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source        text NOT NULL CHECK (source IN ('resend', 'twilio', 'meta')),
  event_type    text NOT NULL,
  payload       jsonb NOT NULL,
  processed     boolean DEFAULT false,
  processed_at  timestamptz,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX idx_webhook_events_unprocessed ON webhook_events(processed, created_at) WHERE processed = false;
