'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { del } from '@vercel/blob'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'
import type { ReportType } from '@/types/database'

const log = createLogger('reports/actions')

const ReportSchema = z.object({
  title: z.string().trim().min(1).max(300),
  type: z.enum(['technical', 'contract']),
  file_name: z.string().min(1),
  file_size: z.number().nullable(),
  mime_type: z.string().nullable(),
  blob_url: z.string().url(),
  blob_pathname: z.string(),
})

export type CreateReportResult =
  | { ok: true; reportId: string }
  | { ok: false; error: string }

export async function createReportAction(
  eventId: string,
  formData: FormData
): Promise<CreateReportResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Nao autenticado' }

  const parsed = ReportSchema.safeParse({
    title: formData.get('title'),
    type: formData.get('type'),
    file_name: formData.get('file_name'),
    file_size: formData.get('file_size') ? Number(formData.get('file_size')) : null,
    mime_type: formData.get('mime_type') || null,
    blob_url: formData.get('blob_url'),
    blob_pathname: formData.get('blob_pathname'),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados invalidos' }
  }

  const { data: member } = await supabase
    .from('team_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!member) return { ok: false, error: 'Membro nao encontrado' }

  const { data: event } = await supabase
    .from('events')
    .select('organization_id')
    .eq('id', eventId)
    .single()
  if (!event) return { ok: false, error: 'Evento nao encontrado' }

  const { data: report, error } = await supabase
    .from('event_reports')
    .insert({
      event_id: eventId,
      organization_id: event.organization_id,
      uploaded_by: member.id,
      title: parsed.data.title,
      type: parsed.data.type as ReportType,
      file_name: parsed.data.file_name,
      file_size: parsed.data.file_size,
      mime_type: parsed.data.mime_type,
      blob_url: parsed.data.blob_url,
      blob_pathname: parsed.data.blob_pathname,
    })
    .select('id')
    .single()

  if (error || !report) {
    log.error('insert report failed', { error: error?.message })
    try { await del(parsed.data.blob_url) } catch {}
    return { ok: false, error: 'Falha ao criar relatorio' }
  }

  revalidatePath(`/dashboard/events/${eventId}/reports`)
  revalidatePath(`/dashboard/events/${eventId}`)

  return { ok: true, reportId: report.id }
}

export async function deleteReportAction(
  eventId: string,
  reportId: string,
  blobUrl: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Nao autenticado' }

  const { error } = await supabase
    .from('event_reports')
    .delete()
    .eq('id', reportId)
    .eq('event_id', eventId)

  if (error) return { ok: false, error: 'Falha ao apagar' }

  try { await del(blobUrl) } catch (e) {
    log.error('blob delete failed', { blobUrl, error: String(e) })
  }

  revalidatePath(`/dashboard/events/${eventId}/reports`)
  revalidatePath(`/dashboard/events/${eventId}`)

  return { ok: true }
}
