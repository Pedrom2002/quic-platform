'use server'

import { z } from 'zod'
import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgAuthFull } from '@/lib/supabase/actions'
import { dispatchArticleNotification } from '@/lib/notifications/dispatchArticleNotification'
import { createLogger } from '@/lib/logger'
import type { Event, EventArticle } from '@/types/database'

const log = createLogger('cliping/actions')

const ArticleSchema = z.object({
  title: z.string().trim().min(1).max(300),
  url: z.string().url().refine(u => /^https?:/i.test(u), 'URL deve comecar com http(s)://'),
  source: z
    .string()
    .trim()
    .max(120)
    .optional()
    .or(z.literal('')),
})

export type CreateArticleResult =
  | { ok: true; articleId: string; notifiedClients: number }
  | { ok: false; error: string }

export async function createArticleAction(eventId: string, formData: FormData): Promise<CreateArticleResult> {
  const auth = await getOrgAuthFull()
  if (!auth) return { ok: false, error: 'Nao autenticado' }
  const { supabase, member } = auth

  const parsed = ArticleSchema.safeParse({
    title: formData.get('title'),
    url: formData.get('url'),
    source: formData.get('source') ?? '',
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados invalidos' }
  }

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)
    .single<Event>()
  if (!event) return { ok: false, error: 'Evento nao encontrado' }

  const sourceVal = parsed.data.source && parsed.data.source.length > 0 ? parsed.data.source : null

  const { data: article, error } = await supabase
    .from('event_articles')
    .insert({
      event_id: eventId,
      organization_id: event.organization_id,
      title: parsed.data.title,
      url: parsed.data.url,
      source: sourceVal,
      created_by: member?.id ?? null,
    })
    .select('*')
    .single<EventArticle>()

  if (error || !article) {
    log.error('insert article failed', { error: error?.message })
    return { ok: false, error: 'Falha ao criar artigo' }
  }

  const admin = createAdminClient()
  const { count: notifiedClients } = await admin
    .from('event_clients')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('opted_out', false)

  after(dispatchArticleNotification({ event, article }))

  revalidatePath(`/dashboard/events/${eventId}/cliping`)
  revalidatePath(`/dashboard/events/${eventId}/notifications`)
  revalidatePath(`/dashboard/events/${eventId}`)

  return { ok: true, articleId: article.id, notifiedClients: notifiedClients ?? 0 }
}

export async function deleteArticleAction(eventId: string, articleId: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await getOrgAuthFull()
  if (!auth) return { ok: false, error: 'Nao autenticado' }
  const { supabase, member } = auth

  const { error } = await supabase
    .from('event_articles')
    .delete()
    .eq('id', articleId)
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)
  if (error) return { ok: false, error: 'Falha ao apagar' }

  revalidatePath(`/dashboard/events/${eventId}/cliping`)
  return { ok: true }
}
