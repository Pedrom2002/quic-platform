-- =========================================================
-- DEMO SEED: Golden Circle, Bilhetes e Catálogo de Stock
-- Correr no Supabase Dashboard > SQL Editor, DEPOIS de
-- demo_santos_campolide.sql (usa o evento criado por esse seed).
-- Requer: org 00000000-0000-0000-0000-000000000001 existente,
--         evento 'santos-campolide-2025' já seedado.
--
-- NOTA sobre investidores: investors.auth_user_id é NOT NULL e tem
-- FK para auth.users(id), que só pode ser criado via Supabase Auth
-- (signUp), nunca por INSERT direto num seed SQL. Por isso este seed
-- cobre apenas investment_projects (visível na página pública /golden-circle
-- e na app mobile) — sem investidores/investimentos de demonstração
-- associados. Para testar o fluxo completo de investidor, regista uma
-- conta real via /investors/signup e aprova-a manualmente em
-- /dashboard/golden-circle/investidores.
-- =========================================================

DO $$
DECLARE
  v_org_id   uuid := '00000000-0000-0000-0000-000000000001';
  v_event_id uuid := '00000000-0000-0000-0099-000000000001';

  -- investment_projects IDs
  p01 uuid := '00000000-0000-0099-0003-000000000001';
  p02 uuid := '00000000-0000-0099-0003-000000000002';
  p03 uuid := '00000000-0000-0099-0003-000000000003';

  -- ticket_types IDs
  t01 uuid := '00000000-0000-0099-0004-000000000001';
  t02 uuid := '00000000-0000-0099-0004-000000000002';

  -- stock_materials IDs (categorias já existem, ver 0034_stock_init.sql)
  v_cat_som   uuid;
  v_cat_luz   uuid;
  v_cat_palco uuid;

BEGIN

  -- -------------------------------------------------------
  -- Golden Circle: projetos de investimento
  -- -------------------------------------------------------
  INSERT INTO investment_projects (
    id, organization_id, name, description, status,
    funding_goal_cents, capacity, investment_deadline,
    actual_revenue_cents, attendance
  ) VALUES
  (p01, v_org_id, 'Concerto Sala Tejo — Nov 2026',
   'Produção de médio porte, capacidade 4.000 lugares. Ronda de investimento em preparação.',
   'open', 50000000, 4000, '2026-10-15', null, null),

  (p02, v_org_id, 'Digressão Nacional — Q1 2027',
   'Digressão de 6 datas em 4 cidades. Estrutura de investimento por data ou pacote completo.',
   'coming_soon', 120000000, null, null, null, null),

  (p03, v_org_id, 'Santos de Campolide 2025',
   'Produção já concluída, incluída como exemplo de track record com receita e assistência reais.',
   'completed', 30000000, 3200, '2025-05-01', 34000000, 3050)
  ON CONFLICT DO NOTHING;

  -- -------------------------------------------------------
  -- Bilhetes: tipos de bilhete para o evento demo existente
  -- -------------------------------------------------------
  INSERT INTO ticket_types (
    id, event_id, organization_id, name, description,
    price_cents, currency, quantity_total, quantity_sold, is_active
  ) VALUES
  (t01, v_event_id, v_org_id, 'Entrada Geral',
   'Acesso ao recinto, zona de arraial e vista para o palco principal.',
   1500, 'eur', 3000, 420, true),

  (t02, v_event_id, v_org_id, 'Acesso VIP',
   'Zona reservada junto ao palco, bar exclusivo e casas de banho dedicadas.',
   4000, 'eur', 200, 65, true)
  ON CONFLICT DO NOTHING;

  -- Torna o evento demo visível no feed público de eventos (mobile/app/(tabs)/index.tsx
  -- e web) — necessário para ver os tipos de bilhete acima em ação.
  UPDATE events
  SET is_public_listed = true,
      cover_image_url = COALESCE(cover_image_url, 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200')
  WHERE id = v_event_id;

  -- -------------------------------------------------------
  -- Catálogo de stock: materiais de exemplo
  -- (categorias já semeadas em 0034_stock_init.sql)
  -- -------------------------------------------------------
  SELECT id INTO v_cat_som FROM stock_categories WHERE name = 'Som' LIMIT 1;
  SELECT id INTO v_cat_luz FROM stock_categories WHERE name = 'Luz' LIMIT 1;
  SELECT id INTO v_cat_palco FROM stock_categories WHERE name = 'Palco' LIMIT 1;

  IF v_cat_som IS NOT NULL AND NOT EXISTS (SELECT 1 FROM stock_materials WHERE name = 'Coluna Ativa JBL PRX815') THEN
    INSERT INTO stock_materials (name, description, category_id, unit, quantity_total, photo_url, is_public, active) VALUES
    ('Coluna Ativa JBL PRX815', 'Coluna ativa 15", 1500W, ideal para eventos de média dimensão.', v_cat_som, 'un', 12,
     'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800', true, true),
    ('Mesa de Mistura Yamaha QL5', 'Mesa digital 32 canais, usada em produções de palco principal.', v_cat_som, 'un', 2,
     'https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=800', true, true);
  END IF;

  IF v_cat_luz IS NOT NULL AND NOT EXISTS (SELECT 1 FROM stock_materials WHERE name = 'Moving Head Robe BMFL') THEN
    INSERT INTO stock_materials (name, description, category_id, unit, quantity_total, photo_url, is_public, active) VALUES
    ('Moving Head Robe BMFL', 'Projetor robótico de alta potência para rig de iluminação de palco.', v_cat_luz, 'un', 24,
     'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800', true, true);
  END IF;

  IF v_cat_palco IS NOT NULL AND NOT EXISTS (SELECT 1 FROM stock_materials WHERE name = 'Estrutura de Palco 8x6m') THEN
    INSERT INTO stock_materials (name, description, category_id, unit, quantity_total, photo_url, is_public, active) VALUES
    ('Estrutura de Palco 8x6m', 'Estrutura modular com cobertura, altura ajustável até 6m.', v_cat_palco, 'un', 1,
     'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800', true, true);
  END IF;

  RAISE NOTICE 'Demo Golden Circle, Bilhetes e Stock criado com sucesso!';
  RAISE NOTICE 'Golden Circle: 3 projetos de investimento (sem investidores demo, ver nota no topo do ficheiro)';
  RAISE NOTICE 'Bilhetes: 2 tipos no evento Santos de Campolide 2025';
  RAISE NOTICE 'Stock: materiais de exemplo em Som, Luz e Palco';

END $$;
