-- =========================================================
-- SEED: Checklist tasks for Santos a Campolide
-- Event ID: 00000000-0000-0000-0099-000000000001
-- Correr no Supabase Dashboard > SQL Editor
-- Idempotente: itens com mesmo title+category+event_id nao sao duplicados
-- =========================================================

DO $$
DECLARE
  v_event_id uuid := '00000000-0000-0000-0099-000000000001';
  v_next_pos integer;
  seed_items RECORD;
BEGIN
  SELECT COALESCE(MAX(position), 0) + 1 INTO v_next_pos
  FROM event_checklist_items
  WHERE event_id = v_event_id;

  FOR seed_items IN
    SELECT *
    FROM (VALUES
      ('Painel de luz para a zona dos camarins',                                                                             'Estruturas em Falta',             1),
      ('Ligacoes eletricas para todas as estruturas, cablagem geral',                                                        'Estruturas em Falta',             2),
      ('16 piquetes com disponibilidade para manutencao 24 horas',                                                           'Estruturas em Falta',             3),
      ('Photo Booth',                                                                                                         'Estruturas em Falta',             4),
      ('Material logistico de apoio - Tenda com dimensoes de 2m por 2m',                                                     'Estruturas em Falta',             5),
      ('Palco com dimensoes de 10m x 10m e regies cobertas com dimensoes de 3m x 3m',                                       'Estruturas em Falta',             6),
      ('Sistema line-array com 8 topos por lado e subgrave (1 por lado)',                                                    'Sistema de Som',                  7),
      ('2 mesas de mistura de palco independentes por stage, ate 8 monitores',                                               'Sistema de Som',                  8),
      ('2 side-fills por lado',                                                                                               'Sistema de Som',                  9),
      ('8 canais in-ear, microfonia adequada, bem como toda a cablagem e acessorios necessarios ao funcionamento do sistema','Sistema de Som',                  10),
      ('8 projetores Spot One',                                                                                               'Sistema de Iluminacao',           11),
      ('8 Wash LED',                                                                                                          'Sistema de Iluminacao',           12),
      ('4 Beam',                                                                                                              'Sistema de Iluminacao',           13),
      ('6 Strobes',                                                                                                           'Sistema de Iluminacao',           14),
      ('1 maquina de fumo/haze',                                                                                              'Sistema de Iluminacao',           15),
      ('4 blinders de 4 unidades',                                                                                            'Sistema de Iluminacao',           16),
      ('4 blinders de 2 unidades',                                                                                            'Sistema de Iluminacao',           17),
      ('2 varas de Par 56 para frente de palco, mesa de controlo de iluminacao e followspot',                                'Sistema de Iluminacao',           18),
      ('1 gerador ate 50 KVA devidamente certificado',                                                                       'Energia',                         19),
      ('1 ecra LED P3.9 com dimensoes de 2x3 metros, suspenso',                                                             'Energia',                         20),
      ('2 porticos luminosos de entrada',                                                                                    'Artigos Decorativos',             21),
      ('14 mastros',                                                                                                          'Artigos Decorativos',             22),
      ('Gambiarras',                                                                                                          'Artigos Decorativos',             23),
      ('Festoes',                                                                                                             'Artigos Decorativos',             24),
      ('Grinaldas de Luzes',                                                                                                  'Artigos Decorativos',             25),
      ('Selecao de meios',                                                                                                    'Plano de Marketing e Assessoria', 26),
      ('Comunicacao e Assessoria de Imprensa',                                                                               'Plano de Marketing e Assessoria', 27),
      ('Seguranca no recinto desde sexta-feira (22/05)',                                                                     'Seguranca',                       28),
      ('Elaboracao do mapeamento do evento',                                                                                 'Mapeamento do Evento',            29),
      ('Plano de emergencia',                                                                                                 'Mapeamento do Evento',            30)
    ) AS t(title, category, sort_order)
  LOOP
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

  RAISE NOTICE 'Seed concluido. Proxima posicao disponivel: %', v_next_pos;
END $$;
