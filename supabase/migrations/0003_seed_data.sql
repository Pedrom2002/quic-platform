-- =========================================================
-- Quic Platform — Seed: Organização + Tipos de Evento + Templates
-- =========================================================
-- Executar APÓS criar o primeiro utilizador via Supabase Auth
-- e inserir manualmente o team_member correspondente.
-- =========================================================

-- Organização Quic
INSERT INTO organizations (id, name, slug) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Quic', 'quic')
ON CONFLICT (slug) DO NOTHING;

-- Tipos de evento
INSERT INTO event_types (id, organization_id, name, slug, description, color, icon) VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'Concerto', 'concerto', 'Concertos e festivais de música', '#7c3aed', 'music'),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'Conferência', 'conferencia', 'Conferências e palestras', '#2563eb', 'presentation'),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'Gala Corporativa', 'gala-corporativa', 'Eventos corporativos e galas', '#059669', 'building')
ON CONFLICT DO NOTHING;

-- =========================================================
-- TEMPLATE: Concerto
-- =========================================================
INSERT INTO checklist_templates (id, organization_id, event_type_id, name, version, is_active) VALUES
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001', 'Checklist Concerto Padrão', 1, true)
ON CONFLICT DO NOTHING;

INSERT INTO checklist_template_items (template_id, title, client_label, position, is_client_visible, default_notification_rules) VALUES
  ('00000000-0000-0000-0002-000000000001', 'Montagem do palco', 'Palco montado', 10, true,
    '[{"trigger":"on_complete","delay_minutes":0,"audience":"all_clients","channels":["email","portal"]}]'),
  ('00000000-0000-0000-0002-000000000001', 'Instalação de iluminação', 'Sistema de iluminação configurado', 20, true,
    '[{"trigger":"on_complete","delay_minutes":0,"audience":"all_clients","channels":["email","portal"]}]'),
  ('00000000-0000-0000-0002-000000000001', 'Teste de som', 'Sistema de som testado e aprovado', 30, true,
    '[{"trigger":"on_complete","delay_minutes":0,"audience":"all_clients","channels":["email","portal"]}]'),
  ('00000000-0000-0000-0002-000000000001', 'Instalação de ecrãs e projeção', 'Sistema visual instalado', 40, true,
    '[{"trigger":"on_complete","delay_minutes":0,"audience":"all_clients","channels":["portal"]}]'),
  ('00000000-0000-0000-0002-000000000001', 'Segurança e controlo de acessos', 'Equipa de segurança em posição', 50, true,
    '[{"trigger":"on_complete","delay_minutes":0,"audience":"all_clients","channels":["email","portal"]}]'),
  ('00000000-0000-0000-0002-000000000001', 'Catering confirmado', 'Catering a postos', 60, true,
    '[{"trigger":"on_complete","delay_minutes":0,"audience":"all_clients","channels":["email","portal"]}]'),
  ('00000000-0000-0000-0002-000000000001', 'Verificação de licenças e seguros', 'Documentação em ordem (interno)', 70, false, '[]'),
  ('00000000-0000-0000-0002-000000000001', 'Ensaio final', 'Ensaio concluído', 80, true,
    '[{"trigger":"on_complete","delay_minutes":0,"audience":"all_clients","channels":["email","portal"]}]'),
  ('00000000-0000-0000-0002-000000000001', 'Abertura de portas', 'Evento pronto para receber convidados', 90, true,
    '[{"trigger":"on_complete","delay_minutes":0,"audience":"all_clients","channels":["email","portal"]}]');

-- =========================================================
-- TEMPLATE: Conferência
-- =========================================================
INSERT INTO checklist_templates (id, organization_id, event_type_id, name, version, is_active) VALUES
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000002', 'Checklist Conferência Padrão', 1, true)
ON CONFLICT DO NOTHING;

INSERT INTO checklist_template_items (template_id, title, client_label, position, is_client_visible, default_notification_rules) VALUES
  ('00000000-0000-0000-0002-000000000002', 'Montagem do auditório', 'Auditório preparado', 10, true,
    '[{"trigger":"on_complete","delay_minutes":0,"audience":"all_clients","channels":["email","portal"]}]'),
  ('00000000-0000-0000-0002-000000000002', 'Configuração de equipamento AV', 'Equipamento audiovisual configurado', 20, true,
    '[{"trigger":"on_complete","delay_minutes":0,"audience":"all_clients","channels":["email","portal"]}]'),
  ('00000000-0000-0000-0002-000000000002', 'Teste de ligações de vídeo (remoto)', 'Ligações remotas testadas', 30, true,
    '[{"trigger":"on_complete","delay_minutes":0,"audience":"all_clients","channels":["email","portal"]}]'),
  ('00000000-0000-0000-0002-000000000002', 'Registo de participantes confirmado', 'Sistema de registo ativo', 40, true,
    '[{"trigger":"on_complete","delay_minutes":0,"audience":"all_clients","channels":["portal"]}]'),
  ('00000000-0000-0000-0002-000000000002', 'Coffee break e refeições confirmados', 'Serviço de catering confirmado', 50, true,
    '[{"trigger":"on_complete","delay_minutes":0,"audience":"all_clients","channels":["email","portal"]}]'),
  ('00000000-0000-0000-0002-000000000002', 'Materiais e kits de participante prontos', 'Materiais preparados', 60, true,
    '[{"trigger":"on_complete","delay_minutes":0,"audience":"all_clients","channels":["portal"]}]'),
  ('00000000-0000-0000-0002-000000000002', 'Briefing com oradores', 'Oradores confirmados (interno)', 70, false, '[]'),
  ('00000000-0000-0000-0002-000000000002', 'Abertura do evento', 'Evento iniciado', 80, true,
    '[{"trigger":"on_complete","delay_minutes":0,"audience":"all_clients","channels":["email","portal"]}]');

-- =========================================================
-- TEMPLATE: Gala Corporativa
-- =========================================================
INSERT INTO checklist_templates (id, organization_id, event_type_id, name, version, is_active) VALUES
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000003', 'Checklist Gala Corporativa Padrão', 1, true)
ON CONFLICT DO NOTHING;

INSERT INTO checklist_template_items (template_id, title, client_label, position, is_client_visible, default_notification_rules) VALUES
  ('00000000-0000-0000-0002-000000000003', 'Decoração e montagem do espaço', 'Espaço decorado e pronto', 10, true,
    '[{"trigger":"on_complete","delay_minutes":0,"audience":"all_clients","channels":["email","portal"]}]'),
  ('00000000-0000-0000-0002-000000000003', 'Mesa de honra preparada', 'Mesa de honra montada', 20, true,
    '[{"trigger":"on_complete","delay_minutes":0,"audience":"all_clients","channels":["portal"]}]'),
  ('00000000-0000-0000-0002-000000000003', 'Sistema de som e iluminação', 'Sistema audiovisual configurado', 30, true,
    '[{"trigger":"on_complete","delay_minutes":0,"audience":"all_clients","channels":["email","portal"]}]'),
  ('00000000-0000-0000-0002-000000000003', 'Catering: cocktail de receção pronto', 'Cocktail de receção a postos', 40, true,
    '[{"trigger":"on_complete","delay_minutes":0,"audience":"all_clients","channels":["email","portal"]}]'),
  ('00000000-0000-0000-0002-000000000003', 'Catering: jantar confirmado', 'Serviço de jantar confirmado', 50, true,
    '[{"trigger":"on_complete","delay_minutes":0,"audience":"all_clients","channels":["email","portal"]}]'),
  ('00000000-0000-0000-0002-000000000003', 'Programa de entretenimento confirmado', 'Entretenimento a postos', 60, true,
    '[{"trigger":"on_complete","delay_minutes":0,"audience":"all_clients","channels":["portal"]}]'),
  ('00000000-0000-0000-0002-000000000003', 'Fotógrafo/videógrafo no local', 'Registo fotográfico assegurado', 70, true,
    '[{"trigger":"on_complete","delay_minutes":0,"audience":"all_clients","channels":["portal"]}]'),
  ('00000000-0000-0000-0002-000000000003', 'Receção de convidados', 'Receção a decorrer', 80, true,
    '[{"trigger":"on_complete","delay_minutes":0,"audience":"all_clients","channels":["email","portal"]}]');

-- =========================================================
-- TEMPLATES DE MENSAGEM DEFAULT (email em português)
-- =========================================================
INSERT INTO message_templates (organization_id, name, channel, language, subject, body_template) VALUES
  ('00000000-0000-0000-0000-000000000001',
   'Etapa concluída — email',
   'email', 'pt',
   '✅ {{event_name}} — {{item_client_label}}',
   'Olá {{client_name}},

Temos uma boa notícia sobre o seu evento "{{event_name}}" marcado para {{event_date}}.

A etapa "{{item_client_label}}" foi concluída com sucesso.

{{#if completion_note}}Nota da equipa: {{completion_note}}{{/if}}

Pode acompanhar o progresso completo do seu evento no portal dedicado:
{{portal_url}}

Progresso atual: {{progress_percent}}% concluído.

Qualquer dúvida, estamos à disposição.

Equipa Quic'),

  ('00000000-0000-0000-0000-000000000001',
   'Boas-vindas ao portal',
   'email', 'pt',
   '🎉 O seu evento "{{event_name}}" está em preparação',
   'Olá {{client_name}},

O seu evento "{{event_name}}" está agora em fase de preparação pela equipa Quic.

Criámos um portal dedicado onde pode acompanhar em tempo real o progresso de todas as etapas de preparação:

{{portal_url}}

O link acima é exclusivo para o seu evento. Pode partilhá-lo com a sua equipa.

Equipa Quic'),

  ('00000000-0000-0000-0000-000000000001',
   'Etapa concluída — portal',
   'portal', 'pt',
   NULL,
   '{{item_client_label}} foi concluído.');
