-- =========================================================
-- Quic Platform - Article notification templates (PT)
-- =========================================================

-- email
INSERT INTO message_templates
  (organization_id, name, channel, language, template_key, subject, body_template)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'Novo artigo - Email',
  'email',
  'pt',
  'article_new',
  'Novo artigo sobre {{event_name}}',
  'Ola {{client_name}},

Foi adicionado um novo artigo sobre o seu evento "{{event_name}}":

{{article_title}}
Fonte: {{article_source}}

Ler artigo: {{article_url}}

Acompanhe tudo no portal: {{portal_url}}'
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates
  WHERE organization_id = '00000000-0000-0000-0000-000000000001'
    AND channel = 'email'
    AND language = 'pt'
    AND template_key = 'article_new'
);

-- sms
INSERT INTO message_templates
  (organization_id, name, channel, language, template_key, subject, body_template)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'Novo artigo - SMS',
  'sms',
  'pt',
  'article_new',
  NULL,
  'QUIC: novo artigo sobre {{event_name}} - {{article_title}} {{article_url}}'
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates
  WHERE organization_id = '00000000-0000-0000-0000-000000000001'
    AND channel = 'sms'
    AND language = 'pt'
    AND template_key = 'article_new'
);

-- portal
INSERT INTO message_templates
  (organization_id, name, channel, language, template_key, subject, body_template)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'Novo artigo - Portal',
  'portal',
  'pt',
  'article_new',
  'Novo artigo',
  '{{article_title}} - Fonte: {{article_source}}. Ver: {{article_url}}'
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates
  WHERE organization_id = '00000000-0000-0000-0000-000000000001'
    AND channel = 'portal'
    AND language = 'pt'
    AND template_key = 'article_new'
);
