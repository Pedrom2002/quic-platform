-- =========================================================
-- Quic Platform — Templates client_update (SMS + portal)
-- =========================================================
-- A migração 0011 criou o template_key 'client_update' mas só
-- semeou o canal email. Esta migração adiciona SMS e portal
-- para que dispatchClientUpdate consiga notificar clientes que
-- preferem esses canais.
-- =========================================================

INSERT INTO message_templates (organization_id, name, channel, language, template_key, subject, body_template)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'Comunicação ao cliente — SMS',
  'sms',
  'pt',
  'client_update',
  NULL,
  '{{custom_message}} - Equipa QUIC'
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates
  WHERE organization_id = '00000000-0000-0000-0000-000000000001'
    AND channel = 'sms'
    AND language = 'pt'
    AND template_key = 'client_update'
);

INSERT INTO message_templates (organization_id, name, channel, language, template_key, subject, body_template)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'Comunicação ao cliente — portal',
  'portal',
  'pt',
  'client_update',
  NULL,
  '{{custom_message}}'
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates
  WHERE organization_id = '00000000-0000-0000-0000-000000000001'
    AND channel = 'portal'
    AND language = 'pt'
    AND template_key = 'client_update'
);
