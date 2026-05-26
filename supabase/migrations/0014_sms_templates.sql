-- =========================================================
-- Quic Platform - SMS message templates
-- =========================================================
-- Adds default SMS templates for checklist_complete and
-- checklist_start notifications. Plain text, no HTML,
-- <160 chars per message to avoid multi-part SMS.
-- The unique index from 0011 prevents duplicates on re-run.
-- =========================================================

INSERT INTO message_templates
  (organization_id, name, channel, language, template_key, subject, body_template)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'Etapa concluida - SMS',
  'sms',
  'pt',
  'checklist_complete',
  NULL,
  'QUIC: Etapa "{{item_client_label}}" concluida ({{progress_percent}}%). Acompanhe: {{portal_url}}'
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates
  WHERE organization_id = '00000000-0000-0000-0000-000000000001'
    AND channel = 'sms'
    AND language = 'pt'
    AND template_key = 'checklist_complete'
);

INSERT INTO message_templates
  (organization_id, name, channel, language, template_key, subject, body_template)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'Inicio de preparacao de etapa - SMS',
  'sms',
  'pt',
  'checklist_start',
  NULL,
  'QUIC: Iniciamos a etapa "{{item_client_label}}" do seu evento. Acompanhe: {{portal_url}}'
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates
  WHERE organization_id = '00000000-0000-0000-0000-000000000001'
    AND channel = 'sms'
    AND language = 'pt'
    AND template_key = 'checklist_start'
);
