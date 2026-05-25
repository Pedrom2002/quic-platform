-- =========================================================
-- Quic Platform — checklist_start message templates
-- =========================================================
-- Inserts default email + portal templates for the
-- "item started" notification (template_key = 'checklist_start').
-- The unique index from 0011 prevents duplicates on re-run.
-- =========================================================

INSERT INTO message_templates
  (organization_id, name, channel, language, template_key, subject, body_template)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'Início de preparação de etapa — email',
  'email',
  'pt',
  'checklist_start',
  'A preparação do seu evento começou — {{event_name}}',
  E'Caro(a) {{client_name}},\n\nGostaríamos de informar que a equipa Quic deu início à etapa **{{item_client_label}}** da preparação do seu evento "{{event_name}}", agendado para {{event_date}}.\n\nPode acompanhar o progresso em tempo real através do portal exclusivo do seu evento:\n\n{{portal_url}}\n\nPermanecemos ao seu dispor para qualquer esclarecimento.\n\nCom os melhores cumprimentos,\nEquipa QUIC'
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates
  WHERE organization_id = '00000000-0000-0000-0000-000000000001'
    AND channel = 'email'
    AND language = 'pt'
    AND template_key = 'checklist_start'
);

INSERT INTO message_templates
  (organization_id, name, channel, language, template_key, subject, body_template)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'Início de preparação de etapa — portal',
  'portal',
  'pt',
  'checklist_start',
  NULL,
  'A equipa Quic iniciou a etapa **{{item_client_label}}**.'
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates
  WHERE organization_id = '00000000-0000-0000-0000-000000000001'
    AND channel = 'portal'
    AND language = 'pt'
    AND template_key = 'checklist_start'
);
