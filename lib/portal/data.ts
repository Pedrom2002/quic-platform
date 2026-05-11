import { createAdminClient } from '@/lib/supabase/admin'
import { verifyPortalToken } from './token'
import { calcProgress } from '@/lib/event-status'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'

export interface PortalItemFile {
  id: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  blob_url: string
}

export interface PortalItem {
  id: string
  client_label: string | null
  title: string
  status: string
  completed_at: string | null
  completion_note: string | null
  position: number
  due_at: string | null
  files: PortalItemFile[]
}

export interface PortalEventData {
  event: {
    id: string
    name: string
    venue_name: string | null
    start_datetime: string
    status: string
  }
  eventDateStr: string
  items: PortalItem[]
  progress: { total: number; completed: number; percent: number }
  heroVideo: string | null
  contentVideo: string | null
  eventFiles: PortalItemFile[]
}

export function groupFilesByItem(
  rows: Array<{
    checklist_item_id: string
    event_file: PortalItemFile
  }>
): Map<string, PortalItemFile[]> {
  const map = new Map<string, PortalItemFile[]>()
  for (const row of rows) {
    const existing = map.get(row.checklist_item_id) ?? []
    existing.push(row.event_file)
    map.set(row.checklist_item_id, existing)
  }
  return map
}

export function filterEventLevelFiles(
  allFiles: PortalItemFile[],
  linkedFileIds: Set<string>
): PortalItemFile[] {
  return allFiles.filter(f => !linkedFileIds.has(f.id))
}

export async function getPortalData(token: string): Promise<PortalEventData | null> {
  const payload = await verifyPortalToken(token)
  if (!payload) return null

  const supabase = createAdminClient()

  const { data: eventRaw } = await supabase
    .from('events')
    .select('id, name, venue_name, start_datetime, status, settings, portal_token_revoked_at')
    .eq('id', payload.eventId)
    .single()

  if (!eventRaw) return null

  // Token revogado manualmente — rejeitar mesmo que o JWT ainda seja válido
  if ((eventRaw as Record<string, unknown>).portal_token_revoked_at) return null

  const eventSettings = (eventRaw.settings ?? {}) as Record<string, unknown>
  const normalizeVideo = (v: unknown): string | null => {
    if (typeof v !== 'string' || !v) return null
    if (v.startsWith('/')) return null
    return v
  }
  const heroVideo = normalizeVideo(eventSettings.portal_hero_video)
  const contentVideo = normalizeVideo(eventSettings.portal_content_video)

  const event = eventRaw as PortalEventData['event']

  const { data: itemsRaw } = await supabase
    .from('event_checklist_items')
    .select('id, client_label, title, status, completed_at, completion_note, position, due_at')
    .eq('event_id', payload.eventId)
    .eq('is_client_visible', true)
    .order('position', { ascending: true })

  const itemIds = (itemsRaw ?? []).map(i => i.id)

  const { data: itemFilesRaw, error: itemFilesError } = itemIds.length > 0
    ? await supabase
        .from('checklist_item_files')
        .select('checklist_item_id, event_file:event_files!event_file_id(id, file_name, file_size, mime_type, blob_url)')
        .in('checklist_item_id', itemIds)
    : { data: [], error: null }
  if (itemFilesError) console.error('[getPortalData] itemFiles query failed', itemFilesError)

  const { data: allEventFilesRaw, error: eventFilesError } = await supabase
    .from('event_files')
    .select('id, file_name, file_size, mime_type, blob_url')
    .eq('event_id', payload.eventId)
    .order('created_at', { ascending: true })
  if (eventFilesError) console.error('[getPortalData] eventFiles query failed', eventFilesError)

  const itemFilesRows = (itemFilesRaw ?? []) as unknown as Array<{
    checklist_item_id: string
    event_file: PortalItemFile
  }>

  const filesByItem = groupFilesByItem(itemFilesRows)

  const linkedFileIds = new Set(itemFilesRows.map(r => r.event_file.id))
  const allEventFiles = (allEventFilesRaw ?? []) as PortalItemFile[]
  const eventFiles = filterEventLevelFiles(allEventFiles, linkedFileIds)

  const items = (itemsRaw ?? []).map(item => ({
    ...item,
    due_at: item.due_at ?? null,
    files: filesByItem.get(item.id) ?? [],
  })) as PortalItem[]

  const total = items.length
  const completed = items.filter(i => i.status === 'completed').length

  return {
    event,
    eventDateStr: format(new Date(event.start_datetime), "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt }),
    items,
    progress: { total, completed, percent: calcProgress(completed, total) },
    heroVideo,
    contentVideo,
    eventFiles,
  }
}
