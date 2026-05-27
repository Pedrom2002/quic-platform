import { createAdminClient } from '@/lib/supabase/admin'
import { renderTemplate } from './template-renderer'
import { sendEmail, buildArticleEmailHtml } from './channels/email'
import { sendSms } from './channels/sms'
import { getEnv } from '@/lib/env'
import { createLogger } from '@/lib/logger'
import type { NotificationChannel, NotificationJobPayload } from '@/types/app'
import type { Event, Client, EventClient, MessageTemplate, NotificationJob, EventArticle } from '@/types/database'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'

const log = createLogger('notifications/dispatchArticle')

interface ArticleDispatchContext {
  event: Event
  article: EventArticle
}

const ARTICLE_CHANNELS: NotificationChannel[] = ['email', 'sms', 'portal']

export async function dispatchArticleNotification(ctx: ArticleDispatchContext): Promise<void> {
  const supabase = createAdminClient()

  const { data: eventClients } = await supabase
    .from('event_clients')
    .select('*, client:clients(*)')
    .eq('event_id', ctx.event.id)
    .eq('opted_out', false)

  if (!eventClients?.length) return

  const portalBase = process.env.NEXT_PUBLIC_PORTAL_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
  const portalUrl = `${portalBase}/portal/${ctx.event.portal_token}`
  const eventDate = format(new Date(ctx.event.start_datetime), "d 'de' MMMM 'de' yyyy", { locale: pt })

  const templateKeys = new Set<string>()
  for (const ec of eventClients as unknown as (EventClient & { client: Client })[]) {
    const prefs = ec.notification_prefs as { channels: NotificationChannel[]; language: string } | null
    const prefChannels: NotificationChannel[] = prefs?.channels ?? ['email', 'portal']
    const lang = prefs?.language ?? 'pt'
    for (const ch of ARTICLE_CHANNELS) {
      if (prefChannels.includes(ch)) templateKeys.add(`${ch}:${lang}`)
    }
  }

  const templateCache = new Map<string, MessageTemplate>()
  if (templateKeys.size > 0) {
    const pairs = [...templateKeys].map(k => k.split(':'))
    const channels = [...new Set(pairs.map(([ch]) => ch))]
    const languages = [...new Set(pairs.map(([, lang]) => lang))]

    const { data: templates } = await supabase
      .from('message_templates')
      .select('*')
      .eq('organization_id', ctx.event.organization_id)
      .eq('template_key', 'article_new')
      .in('channel', channels)
      .in('language', languages)
      .eq('is_active', true)

    for (const t of templates ?? []) {
      templateCache.set(`${t.channel}:${t.language}`, t as MessageTemplate)
    }
  }

  if (templateCache.size === 0) {
    log.warn('no article_new templates found', { eventId: ctx.event.id })
    return
  }

  const { QSTASH_TOKEN: qstashToken, NEXT_PUBLIC_APP_URL: appUrl } = getEnv()
  const useQStash = !!qstashToken

  let qstash: import('@upstash/qstash').Client | null = null
  if (useQStash) {
    const { Client: QStashClient } = await import('@upstash/qstash')
    qstash = new QStashClient({ token: qstashToken! })
  }
  const workerUrl = `${appUrl}/api/workers/send-notification`

  type ArticleJobDraft = {
    event_id: string
    event_article_id: string
    client_id: string
    channel: 'email' | 'sms' | 'portal'
    message_template_id: string
    rendered_subject: string | null
    rendered_body: string
    status: 'queued'
    scheduled_at: string
    _client: Client
  }

  const jobDrafts: ArticleJobDraft[] = []

  for (const ec of eventClients as unknown as (EventClient & { client: Client })[]) {
    const client = ec.client
    const prefs = ec.notification_prefs as { channels: NotificationChannel[]; language: string } | null
    const prefChannels: NotificationChannel[] = prefs?.channels ?? ['email', 'portal']
    const lang = prefs?.language ?? 'pt'
    const channels = ARTICLE_CHANNELS.filter(ch => prefChannels.includes(ch))

    for (const channel of channels) {
      const msgTemplate = templateCache.get(`${channel}:${lang}`)
      if (!msgTemplate) continue

      const templateVars = {
        client_name: client.full_name,
        event_name: ctx.event.name,
        event_date: eventDate,
        article_title: ctx.article.title,
        article_url: ctx.article.url,
        article_source: ctx.article.source ?? '',
        portal_url: portalUrl,
      }

      const renderedSubject = msgTemplate.subject ? renderTemplate(msgTemplate.subject, templateVars) : null
      const renderedBody = renderTemplate(msgTemplate.body_template, templateVars)

      jobDrafts.push({
        event_id: ctx.event.id,
        event_article_id: ctx.article.id,
        client_id: client.id,
        channel: channel as 'email' | 'sms' | 'portal',
        message_template_id: msgTemplate.id,
        rendered_subject: renderedSubject,
        rendered_body: renderedBody,
        status: 'queued' as const,
        scheduled_at: new Date().toISOString(),
        _client: client as unknown as Client,
      })
    }
  }

  if (jobDrafts.length === 0) return

  const { data: insertedJobs, error: insertError } = await supabase
    .from('notification_jobs')
    .insert(jobDrafts.map(({ _client: _c, ...row }) => row))
    .select()

  if (insertError || !insertedJobs?.length) {
    log.error('falha ao inserir article jobs', { error: insertError?.message })
    return
  }

  const draftByKey = new Map<string, (typeof jobDrafts)[number]>()
  for (const d of jobDrafts) {
    draftByKey.set(`${d.client_id}:${d.channel}:${d.event_article_id}`, d)
  }

  await Promise.allSettled(
    insertedJobs.map(async (jobRow) => {
      const job = jobRow as NotificationJob & { event_article_id: string | null }
      const key = `${job.client_id}:${job.channel}:${job.event_article_id ?? ''}`
      const draft = draftByKey.get(key)
      if (!draft) {
        log.error('article draft lookup failed', { jobId: job.id, key })
        await supabase.from('notification_jobs').update({ status: 'failed', last_error: 'draft lookup failed' }).eq('id', job.id)
        return
      }

      if (qstash) {
        try {
          const payload: NotificationJobPayload = {
            job_id: job.id,
            event_id: ctx.event.id,
            client_id: draft._client.id,
            channel: draft.channel,
            rendered_subject: draft.rendered_subject,
            rendered_body: draft.rendered_body,
            client_email: draft._client.email,
            client_phone: draft._client.phone,
            client_whatsapp: draft._client.whatsapp,
          }
          const qstashResponse = await qstash!.publishJSON({ url: workerUrl, body: payload, retries: 3 })
          await Promise.all([
            supabase.from('notification_jobs').update({ qstash_message_id: qstashResponse.messageId }).eq('id', job.id),
            supabase.from('notification_log').insert({
              notification_job_id: job.id,
              event_type: 'queued' as const,
              channel: draft.channel,
              provider: 'qstash',
              provider_message_id: qstashResponse.messageId,
            }),
          ])
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          log.error('qstash article dispatch failed', { jobId: job.id, error: msg })
          await supabase.from('notification_jobs').update({ status: 'failed', last_error: msg }).eq('id', job.id)
        }
      } else {
        try {
          let providerId: string | null = null
          if (draft.channel === 'email' && draft._client.email) {
            const html = buildArticleEmailHtml({
              clientName: draft._client.full_name,
              eventName: ctx.event.name,
              articleTitle: ctx.article.title,
              articleUrl: ctx.article.url,
              articleSource: ctx.article.source ?? null,
              portalUrl,
            })
            providerId = await sendEmail({
              to: draft._client.email,
              toName: draft._client.full_name,
              subject: draft.rendered_subject ?? `Novo artigo sobre ${ctx.event.name}`,
              html,
            })
          } else if (draft.channel === 'sms' && draft._client.phone) {
            providerId = await sendSms({ to: draft._client.phone, message: draft.rendered_body })
          } else if (draft.channel !== 'portal') {
            return
          }
          await Promise.all([
            supabase.from('notification_jobs').update({ status: 'delivered', sent_at: new Date().toISOString() }).eq('id', job.id),
            supabase.from('notification_log').insert({
              notification_job_id: job.id,
              event_type: 'sent' as const,
              channel: draft.channel,
              provider: draft.channel === 'portal' ? 'portal' : 'brevo',
              provider_message_id: providerId,
            }),
          ])
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          log.error('direct article dispatch failed', { jobId: job.id, error: msg })
          await supabase.from('notification_jobs').update({ status: 'failed', last_error: msg }).eq('id', job.id)
        }
      }
    })
  )
}
