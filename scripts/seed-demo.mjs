import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required')
  console.error('Copy .env.example to .env.local and fill in the values')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

const ORG_ID = '00000000-0000-0000-0000-000000000001'
const EVENT_TYPE_ID = '00000000-0000-0000-0009-000000000001'
const EVENT_ID = '00000000-0000-0000-0099-000000000001'

const ITEM_IDS = Array.from({ length: 18 }, (_, i) =>
  `00000000-0000-0099-0001-${String(i + 1).padStart(12, '0')}`
)
const FILE_IDS = Array.from({ length: 8 }, (_, i) =>
  `00000000-0000-0099-0002-${String(i + 1).padStart(12, '0')}`
)

function generatePortalToken() {
  // Same algorithm as lib/portal/token.ts — 12 random bytes → 16 base64url chars
  return randomBytes(12).toString('base64url')
}

async function main() {
  console.log('Connecting to Supabase...')

  // Get first team member
  const { data: member, error: memberErr } = await supabase
    .from('team_members')
    .select('id')
    .eq('organization_id', ORG_ID)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (memberErr || !member) {
    console.error('No team member found for org:', memberErr)
    process.exit(1)
  }
  console.log('Using member:', member.id)

  // Generate portal token (same format as app-generated tokens)
  const portalToken = generatePortalToken()
  console.log('Portal token generated.')

  // 1. Event type
  const { error: etErr } = await supabase.from('event_types').upsert({
    id: EVENT_TYPE_ID,
    organization_id: ORG_ID,
    name: 'Festa Popular',
    slug: 'festa-popular',
    description: 'Festas populares e eventos de bairro',
    color: '#dc2626',
    icon: 'music',
  }, { onConflict: 'id' })
  if (etErr) { console.error('event_type:', etErr.message); process.exit(1) }
  console.log('✓ Event type')

  // 2. Event
  const { error: evErr } = await supabase.from('events').upsert({
    id: EVENT_ID,
    organization_id: ORG_ID,
    event_type_id: EVENT_TYPE_ID,
    name: 'Santos de Campolide 2025',
    slug: 'santos-campolide-2025',
    description: 'Festa anual do bairro de Campolide em honra dos Santos Populares. Palco principal com artistas nacionais, arraial tradicional, gastronomia típica e animação para toda a família.',
    venue_name: 'Largo de Campolide',
    venue_address: 'Largo de Campolide, 1070-031 Lisboa',
    start_datetime: '2025-06-13T21:00:00+01:00',
    end_datetime: '2025-06-14T04:00:00+01:00',
    status: 'active',
    portal_token: portalToken,
    created_by: member.id,
  }, { onConflict: 'id' })
  if (evErr) { console.error('event:', evErr.message); process.exit(1) }
  console.log('✓ Event')

  // 3. Checklist items
  const items = [
    { id: ITEM_IDS[0], title: 'Licença de ocupação do espaço público', client_label: 'Autorização camarária aprovada', description: 'Pedido e aprovação da licença de ocupação do Largo de Campolide junto à CML. Inclui planta do espaço, memorial descritivo e seguro de responsabilidade civil.', position: 10, status: 'completed', is_client_visible: true, due_at: '2025-05-15T18:00:00+01:00', completed_at: '2025-05-14T15:32:00+01:00', completion_note: 'Licença aprovada pela CML a 14 de maio. Processo nº 2025/LC/4872. Válida até 14 de junho.' },
    { id: ITEM_IDS[1], title: 'Contratação e rider técnico dos artistas', client_label: 'Artistas confirmados', description: 'Formalização dos contratos com os três artistas do palco principal: Dino d\'Santiago, Calema e DJ Marfox. Recolha e análise dos riders técnicos de cada artista.', position: 20, status: 'completed', is_client_visible: true, due_at: '2025-05-20T18:00:00+01:00', completed_at: '2025-05-18T11:15:00+01:00', completion_note: 'Todos os contratos assinados. Riders técnicos recebidos e enviados para a produção de som.' },
    { id: ITEM_IDS[2], title: 'Planta de segurança e plano de evacuação', client_label: 'Plano de segurança aprovado', description: 'Elaboração do plano de segurança conforme RJSE. Definição de saídas de emergência, zonas de concentração e percursos de evacuação. Submetido à PSP e ANEPC.', position: 30, status: 'completed', is_client_visible: true, due_at: '2025-05-25T18:00:00+01:00', completed_at: '2025-05-22T09:45:00+01:00', completion_note: 'Plano validado pela PSP Lisboa a 22 de maio. 4 saídas de emergência definidas, capacidade máxima de 3.200 pessoas.' },
    { id: ITEM_IDS[3], title: 'Estrutura do palco principal montada', client_label: 'Palco principal montado', description: 'Montagem da estrutura metálica do palco principal (12m x 8m x 6m de altura). Inclui cobertura, alas laterais, iluminação de estrutura e barricadas de segurança frontais.', position: 40, status: 'completed', is_client_visible: true, due_at: '2025-06-11T20:00:00+01:00', completed_at: '2025-06-11T18:30:00+01:00', completion_note: 'Palco montado pela Stageco Portugal. Inspeção de segurança realizada e aprovada. Certificado de segurança estrutural emitido.' },
    { id: ITEM_IDS[4], title: 'Sistema de som — instalação e teste', client_label: 'Sistema de som testado e aprovado', description: 'Instalação do sistema d&b audiotechnik J-Series. PA principal (8+4 caixas por lado), sub-graves (12 unidades), sistema de fill e in-ears para os artistas. Teste de linha completo.', position: 50, status: 'completed', is_client_visible: true, due_at: '2025-06-12T22:00:00+01:00', completed_at: '2025-06-12T20:15:00+01:00', completion_note: 'Sistema instalado e testado. SPL máximo medido: 103 dB(A) a 50m. Dentro dos limites legais. FOH e monitor worlds operacionais.' },
    { id: ITEM_IDS[5], title: 'Sistema de iluminação — rig e foco', client_label: 'Iluminação do palco configurada', description: 'Instalação do rig de iluminação: 24 moving heads Robe BMFL, 16 LED wash, 8 strobes Atomic, 2 follow spots. Programação base de show e foco de todos os fixtures.', position: 60, status: 'completed', is_client_visible: true, due_at: '2025-06-12T23:00:00+01:00', completed_at: '2025-06-12T22:45:00+01:00', completion_note: 'Rig completo instalado e focado. Patch no grandMA3. Show file base carregado e testado com a equipa de iluminação.' },
    { id: ITEM_IDS[6], title: 'Ecrã LED — instalação e teste de sinal', client_label: 'Ecrã LED instalado', description: 'Instalação do ecrã LED de fundo de palco (12m x 4m, pixel pitch 3.9mm). Teste de sinal com o sistema de vídeo (Disguise GX2) e câmaras de IMAG.', position: 70, status: 'completed', is_client_visible: true, due_at: '2025-06-12T23:00:00+01:00', completed_at: '2025-06-12T21:30:00+01:00', completion_note: 'Ecrã instalado e com sinal estável. 2 câmaras de IMAG (PTZ + ENG) operacionais. Sistema de retransmissão para ecrãs laterais ativo.' },
    { id: ITEM_IDS[7], title: 'Geração elétrica — ligação e carga', client_label: 'Fornecimento de energia assegurado', description: 'Instalação de 3 geradores (500 KVA + 250 KVA + 100 KVA de backup). Ligação ao quadro de distribuição principal, quadros satélite para palco, FOH e área de catering. Teste de carga progressiva.', position: 80, status: 'pending', is_client_visible: true, due_at: '2025-06-13T12:00:00+01:00' },
    { id: ITEM_IDS[8], title: 'Sinalética e controlo de acessos', client_label: 'Sinalética e acessos em montagem', description: 'Instalação de sinalética direcional, placas de emergência e sinalização de capacidade. Montagem das bilheteiras e pontos de controlo de acessos. Briefing com a equipa de segurança (60 elementos).', position: 90, status: 'pending', is_client_visible: true, due_at: '2025-06-13T14:00:00+01:00' },
    { id: ITEM_IDS[9], title: 'Estruturas de catering — tendas e equipamento', client_label: 'Área gastronómica em montagem', description: 'Montagem de 8 tendas de restauração (sardinhas, bifanas, pataniscas, bebidas). Instalação de fritadeiras industriais, grelhadores e bancadas refrigeradas. Ligação elétrica de cada ponto.', position: 100, status: 'pending', is_client_visible: true, due_at: '2025-06-13T14:00:00+01:00' },
    { id: ITEM_IDS[10], title: 'WCs portáteis — colocação e limpeza inicial', client_label: 'Instalações sanitárias prontas', description: 'Entrega e colocação de 20 WCs portáteis (16 standard + 4 acessíveis) e 2 módulos de lavatórios. Posicionamento conforme planta aprovada. Limpeza e abastecimento iniciais.', position: 110, status: 'pending', is_client_visible: true, due_at: '2025-06-13T16:00:00+01:00' },
    { id: ITEM_IDS[11], title: 'Comunicações — rádios e rede de produção', client_label: null, description: 'Distribuição de 35 rádios Motorola DP4800e por departamentos. Teste de cobertura em todo o recinto. Ativação da rede WiFi de produção.', position: 120, status: 'pending', is_client_visible: false, due_at: '2025-06-13T17:00:00+01:00' },
    { id: ITEM_IDS[12], title: 'Ensaio de som — Dino d\'Santiago', client_label: 'Ensaio do 1º artista concluído', description: 'Soundcheck completo com a banda de Dino d\'Santiago (8 elementos). Afinação do sistema de PA com o FOH engineer do artista. Teste de in-ears e monitor mix.', position: 130, status: 'pending', is_client_visible: true, due_at: '2025-06-13T17:00:00+01:00' },
    { id: ITEM_IDS[13], title: 'Ensaio de som — Calema', client_label: 'Ensaio do 2º artista concluído', description: 'Soundcheck com o duo Calema (2 elementos + backing track). Confirmação de patch, in-ears e rider técnico. Teste de playback e sincronização com vídeo.', position: 140, status: 'pending', is_client_visible: true, due_at: '2025-06-13T18:30:00+01:00' },
    { id: ITEM_IDS[14], title: 'Ensaio de som — DJ Marfox', client_label: 'Ensaio do 3º artista concluído', description: 'Setup e teste completo do sistema de DJ (Pioneer CDJ-3000 + DJM-900NXS2). Verificação do canal de retorno para monitor e ligação ao sistema de luzes do DJ.', position: 150, status: 'pending', is_client_visible: true, due_at: '2025-06-13T19:30:00+01:00' },
    { id: ITEM_IDS[15], title: 'Credenciação da imprensa e fotógrafos', client_label: null, description: 'Entrega de credenciais aos jornalistas e fotógrafos acreditados (23 elementos). Briefing sobre zonas permitidas, pit de fotografia e regras de cobertura.', position: 160, status: 'pending', is_client_visible: false, due_at: '2025-06-13T19:00:00+01:00' },
    { id: ITEM_IDS[16], title: 'Briefing geral de produção', client_label: 'Equipa briefada e pronta', description: 'Reunião de produção com todos os chefes de departamento. Confirmação de timings, protocolos de emergência, pontos de contacto e plano de contingência meteorológica.', position: 170, status: 'pending', is_client_visible: true, due_at: '2025-06-13T20:00:00+01:00' },
    { id: ITEM_IDS[17], title: 'Abertura de portas ao público', client_label: 'Evento aberto ao público', description: 'Abertura oficial das entradas ao público. Ativação do sistema de contagem de acessos, posicionamento final da segurança e início dos grupos de animação de rua.', position: 180, status: 'pending', is_client_visible: true, due_at: '2025-06-13T21:00:00+01:00' },
  ]

  const itemsToInsert = items.map(i => ({
    ...i,
    event_id: EVENT_ID,
    assigned_to: member.id,
    completed_at: i.completed_at ?? null,
    completion_note: i.completion_note ?? null,
  }))

  const { error: itemsErr } = await supabase.from('event_checklist_items').upsert(itemsToInsert, { onConflict: 'id' })
  if (itemsErr) { console.error('items:', itemsErr.message); process.exit(1) }
  console.log('✓ 18 checklist items')

  // 4. Event files
  const files = [
    { id: FILE_IDS[0], file_name: 'licenca-cml-2025.pdf', file_size: 284672, mime_type: 'application/pdf', blob_url: 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800', blob_pathname: 'santos-campolide/licenca-cml-2025.pdf' },
    { id: FILE_IDS[1], file_name: 'palco-montagem-dia1.jpg', file_size: 3145728, mime_type: 'image/jpeg', blob_url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200', blob_pathname: 'santos-campolide/palco-montagem-dia1.jpg' },
    { id: FILE_IDS[2], file_name: 'palco-montagem-completo.jpg', file_size: 2897920, mime_type: 'image/jpeg', blob_url: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1200', blob_pathname: 'santos-campolide/palco-montagem-completo.jpg' },
    { id: FILE_IDS[3], file_name: 'sistema-som-foh.jpg', file_size: 2621440, mime_type: 'image/jpeg', blob_url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200', blob_pathname: 'santos-campolide/sistema-som-foh.jpg' },
    { id: FILE_IDS[4], file_name: 'rig-iluminacao.jpg', file_size: 3407872, mime_type: 'image/jpeg', blob_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200', blob_pathname: 'santos-campolide/rig-iluminacao.jpg' },
    { id: FILE_IDS[5], file_name: 'ecra-led-instalacao.jpg', file_size: 2359296, mime_type: 'image/jpeg', blob_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200', blob_pathname: 'santos-campolide/ecra-led-instalacao.jpg' },
    { id: FILE_IDS[6], file_name: 'planta-seguranca.pdf', file_size: 512000, mime_type: 'application/pdf', blob_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', blob_pathname: 'santos-campolide/planta-seguranca.pdf' },
    { id: FILE_IDS[7], file_name: 'contratos-artistas.pdf', file_size: 409600, mime_type: 'application/pdf', blob_url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800', blob_pathname: 'santos-campolide/contratos-artistas.pdf' },
  ]

  const { error: filesErr } = await supabase.from('event_files').upsert(
    files.map(f => ({ ...f, event_id: EVENT_ID, organization_id: ORG_ID, uploaded_by: member.id })),
    { onConflict: 'id' }
  )
  if (filesErr) { console.error('files:', filesErr.message); process.exit(1) }
  console.log('✓ 8 event files')

  // 5. Link files to checklist items
  const links = [
    { checklist_item_id: ITEM_IDS[0], event_file_id: FILE_IDS[0] }, // licença
    { checklist_item_id: ITEM_IDS[1], event_file_id: FILE_IDS[7] }, // contratos
    { checklist_item_id: ITEM_IDS[2], event_file_id: FILE_IDS[6] }, // planta seg
    { checklist_item_id: ITEM_IDS[3], event_file_id: FILE_IDS[1] }, // palco dia1
    { checklist_item_id: ITEM_IDS[3], event_file_id: FILE_IDS[2] }, // palco completo
    { checklist_item_id: ITEM_IDS[4], event_file_id: FILE_IDS[3] }, // som foh
    { checklist_item_id: ITEM_IDS[5], event_file_id: FILE_IDS[4] }, // iluminação
    { checklist_item_id: ITEM_IDS[6], event_file_id: FILE_IDS[5] }, // ecrã led
  ]

  const { error: linksErr } = await supabase.from('checklist_item_files').insert(
    links.map(l => ({ ...l, organization_id: ORG_ID, linked_by: member.id }))
  )
  if (linksErr) { console.error('file links:', linksErr.message); process.exit(1) }
  console.log('✓ File links')

  // 6. Notes
  const notes = [
    { checklist_item_id: ITEM_IDS[7], content: 'Geradores chegam amanhã às 9h. Confirmar com o Rui da ElectroEvent a ligação ao quadro principal antes do meio-dia.' },
    { checklist_item_id: ITEM_IDS[8], content: 'A empresa de segurança (Securitas) confirma 60 elementos: 40 no controlo de acessos, 12 no interior do recinto, 8 em reserva. Reunião de briefing às 19h no local.' },
    { checklist_item_id: ITEM_IDS[9], content: 'Confirmar com a Câmara a utilização de fritadeiras a gás — aguardar aprovação da DGEG. Alternativa elétrica em standby se necessário.' },
    { checklist_item_id: ITEM_IDS[12], content: 'FOH engineer do Dino (Miguel Santos) chega às 15h. Rider pede 2h de soundcheck. Confirmar que o camarim está disponível a partir das 14h.' },
    { checklist_item_id: ITEM_IDS[16], content: 'Briefing inclui: protocolo de emergência médica (2 equipas INEM no local), ponto de encontro em caso de evacuação (Rua de Campolide), contactos de todos os chefes de departamento.' },
  ]

  const { error: notesErr } = await supabase.from('checklist_item_notes').insert(
    notes.map(n => ({ ...n, event_id: EVENT_ID, organization_id: ORG_ID, author_id: member.id }))
  )
  if (notesErr && !notesErr.message.includes('duplicate')) {
    console.error('notes:', notesErr.message); process.exit(1)
  }
  console.log('✓ Notes')

  console.log('\n✅ Seed completo!')
  console.log(`Portal URL: /portal/${portalToken}`)
  console.log(`\nGuarda este token para partilhar:\n${portalToken}`)
}

main().catch(e => { console.error(e); process.exit(1) })
