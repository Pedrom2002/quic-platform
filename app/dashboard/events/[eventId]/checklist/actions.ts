'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireOrgAuth, requireOrgAuthFull, getOrgAuth, getOrgAuthFull, assertEventOwnership } from '@/lib/supabase/actions'
import { put } from '@vercel/blob'
import { MAX_FILE_SIZE } from '@/schemas/file.schema'
import { dispatchNotificationsForItem, dispatchStartNotificationForItem } from '@/lib/notifications/dispatcher'
import type { ChecklistItemStatus, ChecklistItemNote, ChecklistItemFileLink, EventFileWithUploader } from '@/types/app'

export async function bulkUpdateChecklistStatusAction(
  eventId: string,
  ids: string[],
  status: ChecklistItemStatus
) {
  const { supabase, member } = await requireOrgAuthFull()

  if (!ids.length) throw new Error('Nenhum item selecionado')
  if (ids.length > 50) throw new Error('Máximo 50 items por operação')

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) throw new Error('Evento não encontrado')

  const updateData: Record<string, unknown> = { status }
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString()
    updateData.completed_by = member.id
  } else {
    updateData.completed_at = null
  }

  const { error } = await supabase
    .from('event_checklist_items')
    .update(updateData)
    .in('id', ids)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)

  if (status === 'completed') {
    const adminClient = createAdminClient()
    const [{ data: event }, { data: completedItems }] = await Promise.all([
      adminClient.from('events').select('*').eq('id', eventId).single(),
      adminClient
        .from('event_checklist_items')
        .select('*')
        .in('id', ids)
        .eq('event_id', eventId),
    ])

    if (event && completedItems?.length) {
      const completedByName = member.full_name ?? 'Equipa QUIC'
      await Promise.allSettled(
        completedItems.map(item =>
          dispatchNotificationsForItem({ event, item, completedByName })
        )
      )
    }
  }

  if (status === 'in_progress') {
    const adminClient = createAdminClient()
    const [{ data: event }, { data: startedItems }] = await Promise.all([
      adminClient.from('events').select('*').eq('id', eventId).single(),
      adminClient
        .from('event_checklist_items')
        .select('*')
        .in('id', ids)
        .eq('event_id', eventId),
    ])

    if (event && startedItems?.length) {
      await Promise.allSettled(
        startedItems.map(item =>
          dispatchStartNotificationForItem({ event, item })
        )
      )
    }
  }
}

export async function loadOrgTeamMembersAction(eventId: string) {
  const auth = await getOrgAuth()
  if (!auth) return []
  const { supabase, member } = auth

  const { data } = await supabase
    .from('team_members')
    .select('id, full_name')
    .eq('organization_id', member.organization_id)
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  return data ?? []
}

export async function reorderChecklistItemsAction(
  eventId: string,
  orderedIds: string[]
) {
  const { supabase, member } = await requireOrgAuth()

  if (!orderedIds.length) throw new Error('Nenhum item para reordenar')
  if (orderedIds.length > 200) throw new Error('Máximo 200 items por operação')

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) throw new Error('Evento não encontrado')

  // Validate that all IDs belong to this event before the bulk upsert.
  // Prevents cross-event position manipulation if client sends foreign IDs.
  const { data: validRows } = await supabase
    .from('event_checklist_items')
    .select('id')
    .in('id', orderedIds)
    .eq('event_id', eventId)

  const validIds = new Set((validRows ?? []).map(r => r.id))
  const rows = orderedIds
    .filter(id => validIds.has(id))
    .map((id, index) => ({ id, position: (index + 1) * 10 }))

  if (rows.length) {
    await supabase
      .from('event_checklist_items')
      .upsert(rows, { onConflict: 'id' })
  }
}

export async function updateChecklistItemAction(
  eventId: string,
  itemId: string,
  fields: {
    title?: string
    description?: string | null
    client_label?: string | null
    due_at?: string | null
    assigned_to?: string | null
    status?: ChecklistItemStatus
  }
) {
  const auth = await getOrgAuthFull()
  if (!auth) return null
  const { supabase, member } = auth

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return null

  const updateData: Record<string, unknown> = { ...fields }
  if (fields.status === 'completed') {
    updateData.completed_at = new Date().toISOString()
  } else if (fields.status !== undefined) {
    updateData.completed_at = null
  }

  const { data, error } = await supabase
    .from('event_checklist_items')
    .update(updateData)
    .eq('id', itemId)
    .eq('event_id', eventId)
    .select('*, assigned_member:team_members!assigned_to(id, full_name, avatar_url)')
    .single()

  if (error) return null

  if (fields.status === 'completed' && data) {
    const adminClient = createAdminClient()
    const { data: event } = await adminClient.from('events').select('*').eq('id', eventId).single()
    if (event) {
      await dispatchNotificationsForItem({ event, item: data, completedByName: member.full_name ?? 'Equipa QUIC' })
    }
  }

  if (fields.status === 'in_progress' && data) {
    const adminClient = createAdminClient()
    const { data: event } = await adminClient.from('events').select('*').eq('id', eventId).single()
    if (event) {
      await dispatchStartNotificationForItem({ event, item: data })
    }
  }

  return data
}

export async function addItemNoteAction(
  eventId: string,
  itemId: string,
  content: string
): Promise<ChecklistItemNote | null> {
  const auth = await getOrgAuth()
  if (!auth) return null
  const { supabase, user, member } = auth

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return null

  if (!content.trim() || content.length > 10000) return null

  const { data: authorRow } = await supabase
    .from('team_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  const { data } = await supabase
    .from('checklist_item_notes')
    .insert({
      checklist_item_id: itemId,
      event_id: eventId,
      organization_id: member.organization_id,
      author_id: authorRow?.id ?? null,
      content: content.trim(),
    })
    .select('*, author:team_members!author_id(id, full_name, avatar_url)')
    .returns<ChecklistItemNote[]>()
    .single()

  return data ?? null
}

export async function deleteItemNoteAction(
  eventId: string,
  itemId: string,
  noteId: string
): Promise<boolean> {
  const auth = await getOrgAuth()
  if (!auth) return false
  const { supabase, member } = auth

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return false

  const { error, count } = await supabase
    .from('checklist_item_notes')
    .delete({ count: 'exact' })
    .eq('id', noteId)
    .eq('checklist_item_id', itemId)
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)

  return !error && (count ?? 0) > 0
}

export async function loadItemNotesAction(
  eventId: string,
  itemId: string
): Promise<ChecklistItemNote[]> {
  const auth = await getOrgAuth()
  if (!auth) return []
  const { supabase, member } = auth

  const { data } = await supabase
    .from('checklist_item_notes')
    .select('*, author:team_members!author_id(id, full_name, avatar_url)')
    .eq('checklist_item_id', itemId)
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)
    .order('created_at', { ascending: false })
    .returns<ChecklistItemNote[]>()

  return data ?? []
}

export async function loadItemFilesAction(
  eventId: string,
  itemId: string
): Promise<ChecklistItemFileLink[]> {
  const auth = await getOrgAuth()
  if (!auth) return []
  const { supabase, member } = auth

  const { data } = await supabase
    .from('checklist_item_files')
    .select('*, file:event_files!event_file_id(*, uploader:team_members!uploaded_by(id, full_name, avatar_url))')
    .eq('checklist_item_id', itemId)
    .eq('organization_id', member.organization_id)
    .order('created_at', { ascending: false })
    .returns<ChecklistItemFileLink[]>()

  return data ?? []
}

export async function loadEventFilesForLinkingAction(eventId: string): Promise<EventFileWithUploader[]> {
  const auth = await getOrgAuth()
  if (!auth) return []
  const { supabase, member } = auth

  const { data } = await supabase
    .from('event_files')
    .select('*, uploader:team_members!uploaded_by(id, full_name, avatar_url)')
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)
    .order('created_at', { ascending: false })
    .returns<EventFileWithUploader[]>()

  return data ?? []
}

export async function linkFileToItemAction(
  eventId: string,
  itemId: string,
  eventFileId: string
): Promise<ChecklistItemFileLink | null> {
  const auth = await getOrgAuth()
  if (!auth) return null
  const { supabase, user, member } = auth

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return null

  const { data: linkedByRow } = await supabase
    .from('team_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  const { data } = await supabase
    .from('checklist_item_files')
    .insert({
      checklist_item_id: itemId,
      event_file_id: eventFileId,
      organization_id: member.organization_id,
      linked_by: linkedByRow?.id ?? null,
    })
    .select('*, file:event_files!event_file_id(*, uploader:team_members!uploaded_by(id, full_name, avatar_url))')
    .returns<ChecklistItemFileLink[]>()
    .single()

  return data ?? null
}

export async function unlinkFileFromItemAction(
  eventId: string,
  itemId: string,
  linkId: string
): Promise<boolean> {
  const auth = await getOrgAuth()
  if (!auth) return false
  const { supabase, member } = auth

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return false

  const { error, count } = await supabase
    .from('checklist_item_files')
    .delete({ count: 'exact' })
    .eq('id', linkId)
    .eq('checklist_item_id', itemId)
    .eq('organization_id', member.organization_id)

  return !error && (count ?? 0) > 0
}

export async function uploadFileToItemAction(
  eventId: string,
  itemId: string,
  formData: FormData
): Promise<ChecklistItemFileLink | null> {
  const auth = await getOrgAuth()
  if (!auth) return null
  const { supabase, user, member } = auth

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return null

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return null
  if (file.size > MAX_FILE_SIZE) return null

  const { ALLOWED_MIME_TYPES, detectMimeFromMagic, isMimeMismatch, safeBlobPathname } = await import('@/schemas/file.schema')
  const declaredMime = file.type || ''
  if (!ALLOWED_MIME_TYPES.has(declaredMime)) return null
  const detectedMime = await detectMimeFromMagic(file)
  if (isMimeMismatch(declaredMime, detectedMime)) return null

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN
  if (!blobToken) return null

  const blob = await put(safeBlobPathname(file.name), file, {
    access: 'public',
    token: blobToken,
  })

  const { data: memberRow } = await supabase
    .from('team_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  const { data: eventFile } = await supabase
    .from('event_files')
    .insert({
      event_id: eventId,
      organization_id: member.organization_id,
      uploaded_by: memberRow?.id ?? null,
      file_name: file.name.slice(0, 255),
      file_size: file.size,
      mime_type: declaredMime,
      blob_url: blob.url,
      blob_pathname: blob.pathname,
    })
    .select('id')
    .single()

  if (!eventFile) return null

  const { data } = await supabase
    .from('checklist_item_files')
    .insert({
      checklist_item_id: itemId,
      event_file_id: eventFile.id,
      organization_id: member.organization_id,
      linked_by: memberRow?.id ?? null,
    })
    .select('*, file:event_files!event_file_id(*, uploader:team_members!uploaded_by(id, full_name, avatar_url))')
    .returns<ChecklistItemFileLink[]>()
    .single()

  return data ?? null
}

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
