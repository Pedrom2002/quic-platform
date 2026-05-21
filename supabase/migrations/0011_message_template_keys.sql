-- =========================================================
-- Quic Platform — Message template discriminator
-- =========================================================
-- Adiciona uma chave estável a cada template de mensagem para
-- que o dispatcher possa escolher o template correto consoante
-- a ação (conclusão de checklist, envio de portal, etc.).
-- Antes desta migração havia dois templates email/pt no mesmo
-- bucket (welcome e checklist_complete), o que fazia com que
-- a atualização de uma tarefa pudesse usar o template errado.
-- =========================================================

ALTER TABLE message_templates
  ADD COLUMN IF NOT EXISTS template_key text;

-- Backfill via padrão de nome
UPDATE message_templates
   SET template_key = CASE
     WHEN name ILIKE '%boas%vindas%'   THEN 'welcome'
     WHEN name ILIKE '%boas vindas%'   THEN 'welcome'
     WHEN name ILIKE '%welcome%'       THEN 'welcome'
     WHEN name ILIKE '%etapa%portal%'  THEN 'checklist_complete'
     WHEN name ILIKE '%etapa%email%'   THEN 'checklist_complete'
     WHEN name ILIKE '%etapa%conclu%'  THEN 'checklist_complete'
     WHEN name ILIKE '%checklist%'     THEN 'checklist_complete'
     WHEN name ILIKE '%update%cliente%' THEN 'client_update'
     WHEN name ILIKE '%atualiza%cliente%' THEN 'client_update'
     ELSE 'custom'
   END
 WHERE template_key IS NULL;

ALTER TABLE message_templates
  ALTER COLUMN template_key SET NOT NULL,
  ALTER COLUMN template_key SET DEFAULT 'custom';

-- Apenas um template ativo por (org, channel, language, key)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_message_templates_key_active
  ON message_templates (organization_id, channel, language, template_key)
  WHERE is_active = true AND template_key <> 'custom';

-- =========================================================
-- Reescreve copy default em tom Quic -> Cliente (PT-PT formal)
-- =========================================================

UPDATE message_templates SET
  name = 'Conclusão de etapa — email',
  subject = 'Atualização da preparação do seu evento — {{event_name}}',
  body_template =
'Caro(a) {{client_name}},

Esperamos que esteja bem.

Informamos que a etapa **{{item_client_label}}** da preparação do seu evento "{{event_name}}", agendado para {{event_date}}, foi concluída com sucesso pela nossa equipa.

{{#if completion_note}}Nota da equipa Quic: {{completion_note}}{{/if}}

Neste momento, a preparação do evento encontra-se em {{progress_percent}}%. Pode acompanhar o detalhe de cada etapa, em tempo real, através do portal exclusivo do seu evento:

{{portal_url}}

Permanecemos ao seu dispor para qualquer esclarecimento.

Com os melhores cumprimentos,
Equipa Quic'
WHERE organization_id = '00000000-0000-0000-0000-000000000001'
  AND channel = 'email'
  AND language = 'pt'
  AND template_key = 'checklist_complete';

UPDATE message_templates SET
  name = 'Boas-vindas ao portal — email',
  subject = 'O portal do seu evento "{{event_name}}" está disponível',
  body_template =
'Caro(a) {{client_name}},

É com prazer que damos início, formalmente, à preparação do seu evento "{{event_name}}", agendado para {{event_date}}.

A partir deste momento, fica ao seu dispor um portal exclusivo onde poderá acompanhar, em tempo real, o progresso de todas as etapas da organização e consultar marcos concluídos:

{{portal_url}}

O acesso é pessoal e foi gerado especificamente para este evento. Poderá partilhá-lo, em segurança, com os membros da sua equipa que considere relevantes.

A Quic agradece a confiança depositada. Permanecemos inteiramente ao seu dispor para qualquer esclarecimento.

Com os melhores cumprimentos,
Equipa Quic'
WHERE organization_id = '00000000-0000-0000-0000-000000000001'
  AND channel = 'email'
  AND language = 'pt'
  AND template_key = 'welcome';

UPDATE message_templates SET
  name = 'Conclusão de etapa — portal',
  body_template = 'Etapa **{{item_client_label}}** concluída pela equipa Quic.'
WHERE organization_id = '00000000-0000-0000-0000-000000000001'
  AND channel = 'portal'
  AND language = 'pt'
  AND template_key = 'checklist_complete';

-- Template para o envio manual "Atualização ao cliente" (texto livre + shell formal)
INSERT INTO message_templates (organization_id, name, channel, language, template_key, subject, body_template)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'Comunicação ao cliente — email',
  'email',
  'pt',
  'client_update',
  'Comunicação sobre o seu evento — {{event_name}}',
'Caro(a) {{client_name}},

{{custom_message}}

Permanecemos ao seu dispor para qualquer esclarecimento adicional.

Com os melhores cumprimentos,
Equipa Quic'
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates
  WHERE organization_id = '00000000-0000-0000-0000-000000000001'
    AND channel = 'email'
    AND language = 'pt'
    AND template_key = 'client_update'
);
