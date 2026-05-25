-- =========================================================
-- SEED: 34 checklist tasks for Santos à Campolide
-- Event ID: 00000000-0000-0000-0099-000000000001
-- Correr no Supabase Dashboard > SQL Editor
-- Idempotente: itens com mesmo title+category+event_id nao sao duplicados
-- =========================================================

DO $$
DECLARE
  v_event_id uuid := '00000000-0000-0000-0099-000000000001';
  v_next_pos integer;
  v_item RECORD;
  seed_items RECORD;
BEGIN
  -- Calcular próxima posição disponível
  SELECT COALESCE(MAX(position), 0) + 1 INTO v_next_pos
  FROM event_checklist_items
  WHERE event_id = v_event_id;

  FOR seed_items IN
    SELECT *
    FROM (VALUES
      ('Painel de luz para a zona dos camarins',                     'Estruturas em Falta',             1),
      ('Ligações elétricas para todas as estruturas, cablagem geral','Estruturas em Falta',             2),
      ('16 piquetes com disponibilidade para manutenção 24 horas',   'Estruturas em Falta',             3),
      ('Photo Booth',                                                 'Estruturas em Falta',             4),
      ('Tenda logística 2m x 2m',                                    'Estruturas em Falta',             5),
      ('Palco 10m x 10m',                                            'Estruturas em Falta',             6),
      ('Régies cobertas 3m x 3m',                                    'Estruturas em Falta',             7),
      ('Line-array 8 topos por lado + subgrave 1 por lado',          'Sistema de Som',                  8),
      ('Mesa de mistura de palco independente stage 1',              'Sistema de Som',                  9),
      ('Mesa de mistura de palco independente stage 2',              'Sistema de Som',                  10),
      ('Monitores, até 8 unidades por stage',                        'Sistema de Som',                  11),
      ('2 side-fills por lado',                                      'Sistema de Som',                  12),
      ('8 canais in-ear',                                            'Sistema de Som',                  13),
      ('Microfonia adequada',                                        'Sistema de Som',                  14),
      ('Cablagem e acessórios de som',                               'Sistema de Som',                  15),
      ('8 projetores Spot One',                                      'Sistema de Iluminação',           16),
      ('8 Wash LED',                                                 'Sistema de Iluminação',           17),
      ('4 Beam',                                                     'Sistema de Iluminação',           18),
      ('6 Strobes',                                                  'Sistema de Iluminação',           19),
      ('1 máquina de fumo/haze',                                     'Sistema de Iluminação',           20),
      ('4 blinders de 4 unidades',                                   'Sistema de Iluminação',           21),
      ('4 blinders de 2 unidades',                                   'Sistema de Iluminação',           22),
      ('2 varas de Par 56 para frente de palco',                     'Sistema de Iluminação',           23),
      ('Mesa de controlo de iluminação',                             'Sistema de Iluminação',           24),
      ('Followspot',                                                  'Sistema de Iluminação',           25),
      ('Gerador até 50 KVA devidamente certificado',                 'Energia',                         26),
      ('Ecrã LED P3.9, 2x3 metros, suspenso',                       'Energia',                         27),
      ('2 pórticos luminosos de entrada',                            'Artigos Decorativos',             28),
      ('14 mastros',                                                 'Artigos Decorativos',             29),
      ('Gambiarras',                                                  'Artigos Decorativos',             30),
      ('Festões',                                                    'Artigos Decorativos',             31),
      ('Grinaldas de Luzes',                                         'Artigos Decorativos',             32),
      ('Seleção de meios',                                           'Plano de Marketing e Assessoria', 33),
      ('Comunicação e Assessoria de Imprensa',                       'Plano de Marketing e Assessoria', 34)
    ) AS t(title, category, sort_order)
  LOOP
    -- Skip if already exists (title + category + event)
    IF EXISTS (
      SELECT 1 FROM event_checklist_items
      WHERE event_id = v_event_id
        AND title = seed_items.title
        AND category = seed_items.category
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO event_checklist_items (event_id, title, category, status, position, is_client_visible)
    VALUES (v_event_id, seed_items.title, seed_items.category, 'pending', v_next_pos, true);

    v_next_pos := v_next_pos + 1;
  END LOOP;

  RAISE NOTICE 'Seed concluído. Próxima posição disponível: %', v_next_pos;
END $$;
