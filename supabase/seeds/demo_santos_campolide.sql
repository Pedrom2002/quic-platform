-- =========================================================
-- DEMO SEED: Santos de Campolide 2025
-- Correr no Supabase Dashboard > SQL Editor
-- Requer: org 00000000-0000-0000-0000-000000000001 existente
--         e pelo menos 1 team_member nessa org
-- =========================================================

DO $$
DECLARE
  v_org_id        uuid := '00000000-0000-0000-0000-000000000001';
  v_event_type_id uuid := '00000000-0000-0000-0009-000000000001';
  v_event_id      uuid := '00000000-0000-0000-0099-000000000001';
  v_member_id     uuid;

  -- checklist item IDs
  i01 uuid := '00000000-0000-0099-0001-000000000001';
  i02 uuid := '00000000-0000-0099-0001-000000000002';
  i03 uuid := '00000000-0000-0099-0001-000000000003';
  i04 uuid := '00000000-0000-0099-0001-000000000004';
  i05 uuid := '00000000-0000-0099-0001-000000000005';
  i06 uuid := '00000000-0000-0099-0001-000000000006';
  i07 uuid := '00000000-0000-0099-0001-000000000007';
  i08 uuid := '00000000-0000-0099-0001-000000000008';
  i09 uuid := '00000000-0000-0099-0001-000000000009';
  i10 uuid := '00000000-0000-0099-0001-000000000010';
  i11 uuid := '00000000-0000-0099-0001-000000000011';
  i12 uuid := '00000000-0000-0099-0001-000000000012';
  i13 uuid := '00000000-0000-0099-0001-000000000013';
  i14 uuid := '00000000-0000-0099-0001-000000000014';
  i15 uuid := '00000000-0000-0099-0001-000000000015';
  i16 uuid := '00000000-0000-0099-0001-000000000016';
  i17 uuid := '00000000-0000-0099-0001-000000000017';
  i18 uuid := '00000000-0000-0099-0001-000000000018';

  -- event_files IDs
  f01 uuid := '00000000-0000-0099-0002-000000000001';
  f02 uuid := '00000000-0000-0099-0002-000000000002';
  f03 uuid := '00000000-0000-0099-0002-000000000003';
  f04 uuid := '00000000-0000-0099-0002-000000000004';
  f05 uuid := '00000000-0000-0099-0002-000000000005';
  f06 uuid := '00000000-0000-0099-0002-000000000006';
  f07 uuid := '00000000-0000-0099-0002-000000000007';
  f08 uuid := '00000000-0000-0099-0002-000000000008';

BEGIN

  -- Obter o primeiro team_member da org
  SELECT id INTO v_member_id
  FROM team_members
  WHERE organization_id = v_org_id AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  -- -------------------------------------------------------
  -- Tipo de evento: Festa Popular
  -- -------------------------------------------------------
  INSERT INTO event_types (id, organization_id, name, slug, description, color, icon)
  VALUES (v_event_type_id, v_org_id, 'Festa Popular', 'festa-popular', 'Festas populares e eventos de bairro', '#dc2626', 'music')
  ON CONFLICT DO NOTHING;

  -- -------------------------------------------------------
  -- Evento principal
  -- -------------------------------------------------------
  INSERT INTO events (
    id, organization_id, event_type_id, name, slug, description,
    venue_name, venue_address, start_datetime, end_datetime, status,
    portal_token, created_by
  ) VALUES (
    v_event_id,
    v_org_id,
    v_event_type_id,
    'Santos de Campolide 2025',
    'santos-campolide-2025',
    'Festa anual do bairro de Campolide em honra dos Santos Populares. Palco principal com artistas nacionais, arraial tradicional, gastronomia típica e animação para toda a família.',
    'Largo de Campolide',
    'Largo de Campolide, 1070-031 Lisboa',
    '2025-06-13 21:00:00+01',
    '2025-06-14 04:00:00+01',
    'active',
    'demo-santos-campolide-2025-quic',
    v_member_id
  ) ON CONFLICT DO NOTHING;

  -- -------------------------------------------------------
  -- Checklist items (18 itens realistas)
  -- -------------------------------------------------------
  INSERT INTO event_checklist_items (
    id, event_id, title, client_label, description,
    position, status, is_client_visible, assigned_to, due_at, completed_at, completion_note
  ) VALUES

  -- CONCLUÍDOS
  (i01, v_event_id,
   'Licença de ocupação do espaço público',
   'Autorização camarária aprovada',
   'Pedido e aprovação da licença de ocupação do Largo de Campolide junto à CML. Inclui planta do espaço, memorial descritivo e seguro de responsabilidade civil.',
   10, 'completed', true, v_member_id,
   '2025-05-15 18:00:00+01', '2025-05-14 15:32:00+01',
   'Licença aprovada pela CML a 14 de maio. Processo nº 2025/LC/4872. Válida até 14 de junho.'),

  (i02, v_event_id,
   'Contratação e rider técnico dos artistas',
   'Artistas confirmados',
   'Formalização dos contratos com os três artistas do palco principal: Dino d''Santiago, Calema e DJ Marfox. Recolha e análise dos riders técnicos de cada artista.',
   20, 'completed', true, v_member_id,
   '2025-05-20 18:00:00+01', '2025-05-18 11:15:00+01',
   'Todos os contratos assinados. Riders técnicos recebidos e enviados para a produção de som.'),

  (i03, v_event_id,
   'Planta de segurança e plano de evacuação',
   'Plano de segurança aprovado',
   'Elaboração do plano de segurança conforme RJSE. Definição de saídas de emergência, zonas de concentração e percursos de evacuação. Submetido à PSP e ANEPC.',
   30, 'completed', true, v_member_id,
   '2025-05-25 18:00:00+01', '2025-05-22 09:45:00+01',
   'Plano validado pela PSP Lisboa a 22 de maio. 4 saídas de emergência definidas, capacidade máxima de 3.200 pessoas.'),

  (i04, v_event_id,
   'Estrutura do palco principal montada',
   'Palco principal montado',
   'Montagem da estrutura metálica do palco principal (12m x 8m x 6m de altura). Inclui cobertura, alas laterais, iluminação de estrutura e barricadas de segurança frontais.',
   40, 'completed', true, v_member_id,
   '2025-06-11 20:00:00+01', '2025-06-11 18:30:00+01',
   'Palco montado pela Stageco Portugal. Inspeção de segurança realizada e aprovada. Certificado de segurança estrutural emitido.'),

  (i05, v_event_id,
   'Sistema de som — instalação e teste',
   'Sistema de som testado e aprovado',
   'Instalação do sistema d&b audiotechnik J-Series. PA principal (8+4 caixas por lado), sub-graves (12 unidades), sistema de fill e in-ears para os artistas. Teste de linha completo.',
   50, 'completed', true, v_member_id,
   '2025-06-12 22:00:00+01', '2025-06-12 20:15:00+01',
   'Sistema instalado e testado. SPL máximo medido: 103 dB(A) a 50m. Dentro dos limites legais. FOH e monitor worlds operacionais.'),

  (i06, v_event_id,
   'Sistema de iluminação — rig e foco',
   'Iluminação do palco configurada',
   'Instalação do rig de iluminação: 24 moving heads Robe BMFL, 16 LED wash, 8 strobes Atomic, 2 follow spots. Programação base de show e foco de todos os fixtures.',
   60, 'completed', true, v_member_id,
   '2025-06-12 23:00:00+01', '2025-06-12 22:45:00+01',
   'Rig completo instalado e focado. Patch no grandMA3. Show file base carregado e testado com a equipa de iluminação.'),

  (i07, v_event_id,
   'Ecrã LED — instalação e teste de sinal',
   'Ecrã LED instalado',
   'Instalação do ecrã LED de fundo de palco (12m x 4m, pixel pitch 3.9mm). Teste de sinal com o sistema de vídeo (Disguise GX2) e câmaras de IMAG.',
   70, 'completed', true, v_member_id,
   '2025-06-12 23:00:00+01', '2025-06-12 21:30:00+01',
   'Ecrã instalado e com sinal estável. 2 câmaras de IMAG (PTZ + ENG) operacionais. Sistema de retransmissão para ecrãs laterais ativo.'),

  -- EM PROGRESSO / PENDENTES
  (i08, v_event_id,
   'Geração elétrica — ligação e carga',
   'Fornecimento de energia assegurado',
   'Instalação de 3 geradores (500 KVA + 250 KVA + 100 KVA de backup). Ligação ao quadro de distribuição principal, quadros satélite para palco, FOH e área de catering. Teste de carga progressiva.',
   80, 'pending', true, v_member_id,
   '2025-06-13 12:00:00+01', null, null),

  (i09, v_event_id,
   'Sinalética e controlo de acessos',
   'Sinalética e acessos em montagem',
   'Instalação de sinalética direcional, placas de emergência e sinalização de capacidade. Montagem das bilheteiras e pontos de controlo de acessos. Briefing com a equipa de segurança (60 elementos).',
   90, 'pending', true, v_member_id,
   '2025-06-13 14:00:00+01', null, null),

  (i10, v_event_id,
   'Estruturas de catering — tendas e equipamento',
   'Área gastronómica em montagem',
   'Montagem de 8 tendas de restauração (sardinhas, bifanas, pataniscas, bebidas). Instalação de fritadeiras industriais, grelhadores e bancadas refrigeradas. Ligação elétrica de cada ponto.',
   100, 'pending', true, v_member_id,
   '2025-06-13 14:00:00+01', null, null),

  (i11, v_event_id,
   'WCs portáteis — colocação e limpeza inicial',
   'Instalações sanitárias prontas',
   'Entrega e colocação de 20 WCs portáteis (16 standard + 4 acessíveis) e 2 módulos de lavatórios. Posicionamento conforme planta aprovada. Limpeza e abastecimento iniciais.',
   110, 'pending', true, v_member_id,
   '2025-06-13 16:00:00+01', null, null),

  (i12, v_event_id,
   'Comunicações — rádios e rede de produção',
   'Comunicações de produção ativas',
   'Distribuição de 35 rádios Motorola DP4800e por departamentos (produção, segurança, técnicos, catering). Teste de cobertura em todo o recinto. Ativação da rede WiFi de produção.',
   120, 'pending', false, v_member_id,
   '2025-06-13 17:00:00+01', null, null),

  (i13, v_event_id,
   'Ensaio de som — Dino d''Santiago',
   'Ensaio do 1º artista concluído',
   'Soundcheck completo com a banda de Dino d''Santiago (8 elementos). Afinação do sistema de PA com o FOH engineer do artista. Teste de in-ears e monitor mix.',
   130, 'pending', true, v_member_id,
   '2025-06-13 17:00:00+01', null, null),

  (i14, v_event_id,
   'Ensaio de som — Calema',
   'Ensaio do 2º artista concluído',
   'Soundcheck com o duo Calema (2 elementos + backing track). Confirmação de patch, in-ears e rider técnico. Teste de playback e sincronização com vídeo.',
   140, 'pending', true, v_member_id,
   '2025-06-13 18:30:00+01', null, null),

  (i15, v_event_id,
   'Ensaio de som — DJ Marfox',
   'Ensaio do 3º artista concluído',
   'Setup e teste completo do sistema de DJ (Pioneer CDJ-3000 + DJM-900NXS2). Verificação do canal de retorno para monitor e ligação ao sistema de luzes do DJ.',
   150, 'pending', true, v_member_id,
   '2025-06-13 19:30:00+01', null, null),

  (i16, v_event_id,
   'Credenciação da imprensa e fotógrafos',
   'Acreditação de media concluída',
   'Entrega de credenciais aos jornalistas e fotógrafos acreditados (23 elementos). Briefing sobre zonas permitidas, pit de fotografia e regras de cobertura.',
   160, 'pending', false, v_member_id,
   '2025-06-13 19:00:00+01', null, null),

  (i17, v_event_id,
   'Briefing geral de produção',
   'Equipa briefada e pronta',
   'Reunião de produção com todos os chefes de departamento. Confirmação de timings, protocolos de emergência, pontos de contacto e plano de contingência meteorológica.',
   170, 'pending', true, v_member_id,
   '2025-06-13 20:00:00+01', null, null),

  (i18, v_event_id,
   'Abertura de portas ao público',
   'Evento aberto ao público',
   'Abertura oficial das entradas ao público. Ativação do sistema de contagem de acessos, posicionamento final da segurança e início dos grupos de animação de rua.',
   180, 'pending', true, v_member_id,
   '2025-06-13 21:00:00+01', null, null);

  -- -------------------------------------------------------
  -- Ficheiros (event_files) com imagens reais via Unsplash
  -- -------------------------------------------------------
  INSERT INTO event_files (
    id, event_id, organization_id, uploaded_by,
    file_name, file_size, mime_type, blob_url, blob_pathname
  ) VALUES
  (f01, v_event_id, v_org_id, v_member_id,
   'licenca-cml-2025.pdf', 284672, 'application/pdf',
   'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800',
   'santos-campolide/licenca-cml-2025.pdf'),

  (f02, v_event_id, v_org_id, v_member_id,
   'palco-montagem-dia1.jpg', 3145728, 'image/jpeg',
   'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200',
   'santos-campolide/palco-montagem-dia1.jpg'),

  (f03, v_event_id, v_org_id, v_member_id,
   'palco-montagem-completo.jpg', 2897920, 'image/jpeg',
   'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1200',
   'santos-campolide/palco-montagem-completo.jpg'),

  (f04, v_event_id, v_org_id, v_member_id,
   'sistema-som-foh.jpg', 2621440, 'image/jpeg',
   'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200',
   'santos-campolide/sistema-som-foh.jpg'),

  (f05, v_event_id, v_org_id, v_member_id,
   'rig-iluminacao.jpg', 3407872, 'image/jpeg',
   'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',
   'santos-campolide/rig-iluminacao.jpg'),

  (f06, v_event_id, v_org_id, v_member_id,
   'ecra-led-instalacao.jpg', 2359296, 'image/jpeg',
   'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200',
   'santos-campolide/ecra-led-instalacao.jpg'),

  (f07, v_event_id, v_org_id, v_member_id,
   'planta-seguranca.pdf', 512000, 'application/pdf',
   'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800',
   'santos-campolide/planta-seguranca.pdf'),

  (f08, v_event_id, v_org_id, v_member_id,
   'contratos-artistas.pdf', 409600, 'application/pdf',
   'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800',
   'santos-campolide/contratos-artistas.pdf');

  -- -------------------------------------------------------
  -- Ligar ficheiros às checklist items (itens concluídos)
  -- -------------------------------------------------------
  INSERT INTO checklist_item_files (checklist_item_id, event_file_id, organization_id, linked_by) VALUES
  -- Licença camarária → ficheiro PDF licença
  (i01, f01, v_org_id, v_member_id),
  -- Contratos artistas → PDF contratos
  (i02, f08, v_org_id, v_member_id),
  -- Plano de segurança → PDF planta
  (i03, f07, v_org_id, v_member_id),
  -- Palco montado → 2 fotos
  (i04, f02, v_org_id, v_member_id),
  (i04, f03, v_org_id, v_member_id),
  -- Som → foto FOH
  (i05, f04, v_org_id, v_member_id),
  -- Iluminação → foto rig
  (i06, f05, v_org_id, v_member_id),
  -- Ecrã LED → foto instalação
  (i07, f06, v_org_id, v_member_id);

  -- -------------------------------------------------------
  -- Notas nas checklist items
  -- -------------------------------------------------------
  INSERT INTO checklist_item_notes (checklist_item_id, event_id, organization_id, author_id, content) VALUES
  (i08, v_event_id, v_org_id, v_member_id,
   'Geradores chegam amanhã às 9h. Confirmar com o Rui da ElectroEvent a ligação ao quadro principal antes do meio-dia.'),

  (i09, v_event_id, v_org_id, v_member_id,
   'A empresa de segurança (Securitas) confirma 60 elementos: 40 no controlo de acessos, 12 no interior do recinto, 8 em reserva. Reunião de briefing às 19h no local.'),

  (i10, v_event_id, v_org_id, v_member_id,
   'Confirmar com a Câmara a utilização de fritadeiras a gás, aguardar aprovação da DGEG. Alternativa elétrica em standby se necessário.'),

  (i13, v_event_id, v_org_id, v_member_id,
   'FOH engineer do Dino (Miguel Santos) chega às 15h. Rider pede 2h de soundcheck. Confirmar que o camarim está disponível a partir das 14h.'),

  (i17, v_event_id, v_org_id, v_member_id,
   'Briefing inclui: protocolo de emergência médica (2 equipas INEM no local), ponto de encontro em caso de evacuação (Rua de Campolide), contactos de todos os chefes de departamento.');

  RAISE NOTICE 'Demo Santos de Campolide 2025 criado com sucesso!';
  RAISE NOTICE 'Portal token: demo-santos-campolide-2025-quic';
  RAISE NOTICE 'Acesso portal: /portal/demo-santos-campolide-2025-quic';

END $$;
