'use server'

import { requireOrgAuth, requireOrgAuthFull, assertEventOwnership } from '@/lib/supabase/actions'

// ---------------------------------------------------------------------------
// SEED DATA
// ---------------------------------------------------------------------------

const SEED_ITEMS: { title: string; category: string }[] = [
  // Estruturas em Falta
  { title: 'Painel de luz para a zona dos camarins', category: 'Estruturas' },
  { title: 'Ligações elétricas para todas as estruturas, cablagem geral', category: 'Estruturas' },
  { title: '16 piquetes com disponibilidade para manutenção 24 horas', category: 'Estruturas' },
  { title: 'Photo Booth', category: 'Estruturas' },
  { title: 'Material logístico de apoio - Tenda com dimensões de 2m por 2m', category: 'Estruturas' },
  { title: 'Palco com dimensões de 10m x 10m e régies cobertas com dimensões de 3m x 3m', category: 'Estruturas' },
  // Sistema de Som
  { title: 'Sistema line-array com 8 topos por lado e subgrave (1 por lado)', category: 'Sistema de Som' },
  { title: '2 mesas de mistura de palco independentes por stage, até 8 monitores', category: 'Sistema de Som' },
  { title: '2 side-fills por lado', category: 'Sistema de Som' },
  { title: '8 canais in-ear, microfonia adequada, bem como toda a cablagem e acessórios necessários ao funcionamento do sistema', category: 'Sistema de Som' },
  // Sistema de Iluminação
  { title: '8 projetores Spot One', category: 'Sistema de Iluminação' },
  { title: '8 Wash LED', category: 'Sistema de Iluminação' },
  { title: '4 Beam', category: 'Sistema de Iluminação' },
  { title: '6 Strobes', category: 'Sistema de Iluminação' },
  { title: '1 máquina de fumo/haze', category: 'Sistema de Iluminação' },
  { title: '4 blinders de 4 unidades', category: 'Sistema de Iluminação' },
  { title: '4 blinders de 2 unidades', category: 'Sistema de Iluminação' },
  { title: '2 varas de Par 56 para frente de palco, mesa de controlo de iluminação e followspot', category: 'Sistema de Iluminação' },
  // Energia
  { title: '1 gerador até 50 KVA devidamente certificado', category: 'Energia' },
  { title: '1 ecrã LED P3.9 com dimensões de 2x3 metros, suspenso', category: 'Energia' },
  // Artigos Decorativos
  { title: '2 pórticos luminosos de entrada', category: 'Artigos Decorativos' },
  { title: '14 mastros', category: 'Artigos Decorativos' },
  { title: 'Gambiarras', category: 'Artigos Decorativos' },
  { title: 'Festões', category: 'Artigos Decorativos' },
  { title: 'Grinaldas de Luzes', category: 'Artigos Decorativos' },
  // Plano de Marketing e Assessoria
  { title: 'Seleção de meios', category: 'Plano de Marketing e Assessoria' },
  { title: 'Comunicação e Assessoria de Imprensa', category: 'Plano de Marketing e Assessoria' },
  // Segurança
  { title: 'Segurança no recinto desde sexta-feira (22/05)', category: 'Segurança' },
  // Mapeamento do Evento
  { title: 'Elaboração do mapeamento do evento', category: 'Mapeamento do Evento' },
  { title: 'Plano de emergência', category: 'Mapeamento do Evento' },
]

// ---------------------------------------------------------------------------
// seedChecklistTasksAction
// ---------------------------------------------------------------------------

export async function seedChecklistTasksAction(
  eventId: string
): Promise<{ inserted: number }> {
  const { supabase, member } = await requireOrgAuth()

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) throw new Error('Evento não encontrado')

  // Fetch existing items to skip duplicates and track max positions
  const { data: existing } = await supabase
    .from('event_checklist_items')
    .select('title, category, position')
    .eq('event_id', eventId)

  const existingKeys = new Set(
    (existing ?? []).map(i => `${i.title}__${i.category ?? ''}`)
  )

  const maxPositionByCategory = new Map<string, number>()
  for (const row of existing ?? []) {
    const cat = row.category ?? '__geral__'
    maxPositionByCategory.set(cat, Math.max(maxPositionByCategory.get(cat) ?? 0, row.position))
  }

  const toInsert: {
    event_id: string
    title: string
    category: string
    position: number
    is_client_visible: boolean
    status: 'pending'
    notification_rules: { trigger: string; delay_minutes: number; audience: string; channels: string[] }[]
  }[] = []

  for (const item of SEED_ITEMS) {
    const key = `${item.title}__${item.category}`
    if (existingKeys.has(key)) continue

    const cat = item.category
    const currentMax = maxPositionByCategory.get(cat) ?? 0
    const nextPos = currentMax + 1
    maxPositionByCategory.set(cat, nextPos) // advance for next item in same category

    toInsert.push({
      event_id: eventId,
      title: item.title,
      category: item.category,
      position: nextPos,
      is_client_visible: true,
      status: 'pending',
      notification_rules: [{ trigger: 'on_complete', delay_minutes: 0, audience: 'all_clients', channels: ['email', 'sms', 'portal', 'push'] }],
    })
  }

  if (!toInsert.length) return { inserted: 0 }

  const { error } = await supabase
    .from('event_checklist_items')
    .insert(toInsert)

  if (error) throw new Error(error.message)

  return { inserted: toInsert.length }
}

// ---------------------------------------------------------------------------
// syncCategoriesToTemplateAction
// ---------------------------------------------------------------------------

export async function syncCategoriesToTemplateAction(
  eventId: string
): Promise<{ inserted: number }> {
  const { supabase, member } = await requireOrgAuthFull()

  // Get event + event_type_id
  const { data: event } = await supabase
    .from('events')
    .select('id, event_type_id')
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)
    .single()

  if (!event) throw new Error('Evento não encontrado')
  if (!event.event_type_id) throw new Error('Evento sem tipo definido')

  // Find or create active template for this event type
  let { data: template } = await supabase
    .from('checklist_templates')
    .select('id')
    .eq('organization_id', member.organization_id)
    .eq('event_type_id', event.event_type_id)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (!template) {
    const { data: created, error: createErr } = await supabase
      .from('checklist_templates')
      .insert({
        organization_id: member.organization_id,
        event_type_id: event.event_type_id,
        name: 'Template Base',
        version: 1,
        is_active: true,
        created_by: member.id,
      })
      .select('id')
      .single()

    if (createErr || !created) throw new Error('Erro ao criar template')
    template = created
  }

  // Fetch existing template items to skip duplicates and track max positions
  const { data: existingTemplateItems } = await supabase
    .from('checklist_template_items')
    .select('title, category, position')
    .eq('template_id', template.id)

  const existingKeys = new Set(
    (existingTemplateItems ?? []).map(i => `${i.title}__${i.category ?? ''}`)
  )

  const maxPosByCategory = new Map<string, number>()
  for (const row of existingTemplateItems ?? []) {
    const cat = row.category ?? '__geral__'
    maxPosByCategory.set(cat, Math.max(maxPosByCategory.get(cat) ?? 0, row.position))
  }

  const toInsert: {
    template_id: string
    title: string
    category: string
    position: number
    is_client_visible: boolean
    default_notification_rules: { trigger: string; delay_minutes: number; audience: string; channels: string[] }[]
  }[] = []

  for (const item of SEED_ITEMS) {
    const key = `${item.title}__${item.category}`
    if (existingKeys.has(key)) continue

    const cat = item.category
    const currentMax = maxPosByCategory.get(cat) ?? 0
    const nextPos = currentMax + 1
    maxPosByCategory.set(cat, nextPos) // advance for next item in same category

    toInsert.push({
      template_id: template.id,
      title: item.title,
      category: item.category,
      position: nextPos,
      is_client_visible: true,
      default_notification_rules: [{ trigger: 'on_complete', delay_minutes: 0, audience: 'all_clients', channels: ['email', 'sms', 'portal', 'push'] }],
    })
  }

  if (!toInsert.length) return { inserted: 0 }

  const { error } = await supabase
    .from('checklist_template_items')
    .insert(toInsert)

  if (error) throw new Error(error.message)

  return { inserted: toInsert.length }
}
