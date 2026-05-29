-- supabase/migrations/0020_activo_lounge_seed.sql

-- 1. Event Type
INSERT INTO event_types (id, organization_id, name, slug, description, color, icon, is_active)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Activo Lounge',
  'activo-lounge',
  'Espaço Lounge do Activo Bank em eventos desportivos',
  '#00A651',
  'sofa',
  true
)
ON CONFLICT (organization_id, slug) DO NOTHING;

-- 2. Checklist Template
INSERT INTO checklist_templates (id, organization_id, event_type_id, name, version, is_active)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Template GoalFest – Activo Lounge',
  1,
  true
)
ON CONFLICT DO NOTHING;

-- 3. Template Items
INSERT INTO checklist_template_items
  (template_id, title, position, category, is_client_visible, default_notification_rules)
VALUES
  -- Espaço Lounge
  ('20000000-0000-0000-0000-000000000001', 'Definir dimensões e layout do espaço', 10, 'Espaço Lounge', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Escolher revestimentos e mobiliário', 20, 'Espaço Lounge', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Confirmar fornecedor de instalação', 30, 'Espaço Lounge', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Agendar montagem (antes dia 11)', 40, 'Espaço Lounge', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Vistoria do espaço montado', 50, 'Espaço Lounge', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Confirmação de desmontagem pós-evento', 60, 'Espaço Lounge', false, '[]'),
  -- Brindes
  ('20000000-0000-0000-0000-000000000001', 'Definir tipo e conceito do brinde', 70, 'Brindes', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Aprovar quantidade e orçamento', 80, 'Brindes', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Seleccionar fornecedor', 90, 'Brindes', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Confirmar encomenda ao fornecedor', 100, 'Brindes', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Receber e verificar brindes', 110, 'Brindes', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Definir plano de distribuição no evento', 120, 'Brindes', false, '[]'),
  -- APP Sorteios
  ('20000000-0000-0000-0000-000000000001', 'Definir mecânica do sorteio', 130, 'APP Sorteios', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Aprovar plataforma (web app)', 140, 'APP Sorteios', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Desenvolver APP de sorteios', 150, 'APP Sorteios', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Testar APP em dispositivos reais', 160, 'APP Sorteios', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Preparar operação no dia do evento', 170, 'APP Sorteios', false, '[]'),
  -- Design do Espaço
  ('20000000-0000-0000-0000-000000000001', 'Briefing de conceito visual', 180, 'Design do Espaço', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Aprovação de moodboard e paleta', 190, 'Design do Espaço', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Produção dos ficheiros finais de design', 200, 'Design do Espaço', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Entrega ao fornecedor de instalação', 210, 'Design do Espaço', false, '[]'),
  -- Materiais Gráficos
  ('20000000-0000-0000-0000-000000000001', 'Listar materiais necessários (banners, totem, roll-up, sinalética)', 220, 'Materiais Gráficos', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Aprovar mockups', 230, 'Materiais Gráficos', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Envio para impressão', 240, 'Materiais Gráficos', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Recepção e verificação dos materiais', 250, 'Materiais Gráficos', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Transporte para o local', 260, 'Materiais Gráficos', false, '[]'),
  -- Conteúdos
  ('20000000-0000-0000-0000-000000000001', 'Definir plano de conteúdos (redes sociais)', 270, 'Conteúdos', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Briefing de fotografia e vídeo', 280, 'Conteúdos', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Aprovar copywriting (legendas, banners, app, sinalética)', 290, 'Conteúdos', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Produzir conteúdos redes sociais', 300, 'Conteúdos', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Produzir vídeo e fotografia', 310, 'Conteúdos', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Agendar publicações', 320, 'Conteúdos', false, '[]'),
  ('20000000-0000-0000-0000-000000000001', 'Elaborar relatório pós-evento', 330, 'Conteúdos', false, '[]');

-- 4. Evento
INSERT INTO events (
  id, organization_id, event_type_id, name, slug,
  description, venue_name, start_datetime, end_datetime, status, created_at
)
VALUES (
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'GoalFest – Activo Lounge',
  'goalfest-activo-lounge',
  'Espaço Lounge do Activo Bank no GoalFest 2026',
  'GoalFest 2026',
  '2026-06-11T00:00:00Z',
  '2026-06-11T23:59:00Z',
  'planning',
  now()
)
ON CONFLICT (organization_id, slug) DO NOTHING;
