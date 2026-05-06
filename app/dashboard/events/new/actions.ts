'use server'

import { createClient } from '@/lib/supabase/server'
import { signPortalToken } from '@/lib/portal/token'
import type { CreateEventInput } from '@/schemas/event.schema'
import type { ChecklistTemplateItem } from '@/types/app'

export interface ChecklistItemDraft {
  id: string
  title: string
  client_label: string | null
  is_client_visible: boolean
  notify_email: boolean
  notify_portal: boolean
}

export async function saveChecklistDraftsAction(
  eventId: string,
  items: ChecklistItemDraft[]
): Promise<void> {
  if (!items.length) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: member } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!member) throw new Error('Não autorizado')

  // Confirm the event belongs to this organisation before touching its items
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!event) throw new Error('Evento não encontrado')

  const rows = items.map((item, index) => {
    const channels: string[] = []
    if (item.notify_email) channels.push('email')
    if (item.notify_portal) channels.push('portal')
    const notificationRules = channels.length > 0
      ? [{ trigger: 'on_complete', delay_minutes: 0, audience: 'all_clients', channels }]
      : []
    return {
      id: item.id,
      event_id: eventId,
      title: item.title,
      client_label: item.client_label || item.title,
      is_client_visible: item.is_client_visible,
      notification_rules: notificationRules,
      position: (index + 1) * 10,
    }
  })

  // Single upsert — atomic at the PostgreSQL statement level.
  // ignoreDuplicates: false ensures existing rows are updated.
  const { error } = await supabase
    .from('event_checklist_items')
    .upsert(rows, { onConflict: 'id', ignoreDuplicates: false })

  if (error) {
    console.error('[saveChecklistDrafts] falha no upsert:', error.message)
    throw new Error('Falha ao guardar etapas. Tenta novamente.')
  }
}

export async function createEventAction(data: CreateEventInput): Promise<{ eventId: string; items: import('@/types/database').EventChecklistItem[] }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: member, error: memberError } = await supabase
    .from('team_members')
    .select('id, organization_id')
    .eq('auth_user_id', user.id)
    .single()
  if (memberError || !member) {
    console.error('[createEvent] member lookup failed:', memberError?.message)
    throw new Error('Não foi possível identificar o utilizador. Tenta novamente.')
  }

  const slug =
    data.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
    '-' +
    Date.now()

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      ...data,
      slug,
      organization_id: member.organization_id,
      created_by: member.id,
    })
    .select()
    .single()
  if (error) {
    console.error('[createEvent] insert failed:', error.message)
    throw new Error('Erro ao criar o evento. Tenta novamente.')
  }

  const portalToken = await signPortalToken(event.id)
  await supabase.from('events').update({ portal_token: portalToken }).eq('id', event.id)

  const { data: template } = await supabase
    .from('checklist_templates')
    .select('id, checklist_template_items(*)')
    .eq('event_type_id', data.event_type_id)
    .eq('is_active', true)
    .single()

  if (template?.checklist_template_items) {
    const items = (template.checklist_template_items as unknown as ChecklistTemplateItem[]).map(item => ({
      event_id: event.id,
      template_item_id: item.id,
      title: item.title,
      client_label: item.client_label,
      description: item.description,
      position: item.position,
      is_client_visible: item.is_client_visible,
      notification_rules: item.default_notification_rules ?? [],
    }))
    await supabase.from('event_checklist_items').insert(items)
  }

  // Return created items so step 2 can show them for customisation
  const { data: items } = await supabase
    .from('event_checklist_items')
    .select('*')
    .eq('event_id', event.id)
    .order('position')

  return { eventId: event.id, items: items ?? [] }
}
