import { createAdminClient } from '@/lib/supabase/admin'
import { renderTemplate } from './template-renderer'
import { getEnv } from '@/lib/env'
import { createLogger } from '@/lib/logger'
import type { NotificationRule, NotificationChannel, NotificationJobPayload } from '@/types/app'
import type { EventChecklistItem, Event, Client, EventClient, MessageTemplate, NotificationJob } from '@/types/database'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { calcProgress } from '@/lib/event-status'

const log = createLogger('notifications/dispatcher')

// Shared helper: insert jobs into DB and publish to QStash (or leave queued for cron).
// Returns number of jobs inserted. Does NOT call Brevo directly — that happens in
// the worker (QStash path) or the cron (no-QStash fallback).
async function insertAndEnqueue(
  supabase: ReturnType<typeof createAdminClient>,
  jobDrafts: Array<{
    event_id: string
    checklist_item_id: string
    client_id: string
    channel: 'email' | 'whatsapp' | 'sms' | 'portal'
    message_template_id: string
    rendered_subject: string | null
    rendered_body: string
    status: 'queued'
    scheduled_at: string
    _client: Client
    _delay_minutes?: number
  }>,
  eventId: string,
  appUrl: string,
): Promise<number> {
  if (jobDrafts.length === 0) return 0

  const { data: insertedJobs, error: insertError } = await supabase
    .from('notification_jobs')
    .insert(jobDrafts.map(({ _client: _c, _delay_minutes: _d, ...row }) => row))
    .select()

  if (insertError || !insertedJobs?.length) {
    log.error('falha ao inserir jobs', { error: insertError?.message })
    return 0
  }

  const { QSTASH_TOKEN: qstashToken } = getEnv()

  const workerUrl = `${appUrl}/api/workers/send-notification`
  const draftByKey = new Map<string, (typeof jobDrafts)[number]>()
  for (const draft of jobDrafts) {
    draftByKey.set(`${draft.client_id}:${draft.channel}:${draft.checklist_item_id}`, draft)
  }

  let qstash: import('@upstash/qstash').Client | null = null
  if (qstashToken) {
    try {
      const { Client: QStashClient } = await import('@upstash/qstash')
      qstash = new QStashClient({ token: qstashToken })
    } catch {
      // QStash unavailable — jobs stay queued for cron pickup
    }
  }

  await Promise.allSettled(
    insertedJobs.map(async (jobRow) => {
      const job = jobRow as NotificationJob
      const key = `${job.client_id}:${job.channel}:${job.checklist_item_id ?? ''}`
      const draft = draftByKey.get(key)

      if (!draft) {
        log.error('draft lookup failed after insert', { jobId: job.id })
        await supabase
          .from('notification_jobs')
          .update({ status: 'failed', last_error: 'draft lookup failed after insert' })
          .eq('id', job.id)
        return
      }

      // No QStash — jobs remain queued and will be processed by the cron
      if (!qstash) return

      try {
        const payload: NotificationJobPayload = {
          job_id: job.id,
          event_id: eventId,
          client_id: draft._client.id,
          channel: draft.channel,
          rendered_subject: draft.rendered_subject,
          rendered_body: draft.rendered_body,
          client_email: draft._client.email,
          client_phone: draft._client.phone,
          client_whatsapp: draft._client.whatsapp,
        }
        const delay = draft._delay_minutes ?? 0
        const res = await qstash!.publishJSON({
          url: workerUrl,
          body: payload,
          ...(delay > 0 && { delay: delay * 60 }),
          retries: 3,
        })
        await Promise.all([
          supabase
            .from('notification_jobs')
            .update({ qstash_message_id: res.messageId })
            .eq('id', job.id),
          supabase.from('notification_log').insert({
            notification_job_id: job.id,
            event_type: 'queued' as const,
            channel: draft.channel,
            provider: 'qstash',
            provider_message_id: res.messageId,
          }),
        ])
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        log.error('qstash enqueue failed', { jobId: job.id, error: msg })
        await supabase
          .from('notification_jobs')
          .update({ status: 'failed', last_error: msg })
          .eq('id', job.id)
      }
    })
  )

  return insertedJobs.length
}

interface DispatchContext {
  event: Event
  item: EventChecklistItem
  completedByName: string
}

export async function dispatchNotificationsForItem(ctx: DispatchContext): Promise<void> {
  const supabase = createAdminClient()
  const rules = (ctx.item.notification_rules as unknown) as NotificationRule[]

  if (!rules?.length) return

  const { data: eventClients } = await supabase
    .from('event_clients')
    .select('*, client:clients(*)')
    .eq('event_id', ctx.event.id)
    .eq('opted_out', false)

  if (!eventClients?.length) return

  const { data: allItems } = await supabase
    .from('event_checklist_items')
    .select('id, status')
    .eq('event_id', ctx.event.id)

  const total = allItems?.length ?? 0
  const completed = allItems?.filter(i => i.status === 'completed').length ?? 0
  const progressPercent = calcProgress(completed, total)

  const portalBase = process.env.NEXT_PUBLIC_PORTAL_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
  const portalUrl = `${portalBase}/portal/${ctx.event.portal_token}`
  const eventDate = format(new Date(ctx.event.start_datetime), "d 'de' MMMM 'de' yyyy", { locale: pt })

  const templateKeys = new Set<string>()
  for (const rule of rules) {
    const targets = filterClientsByAudience(eventClients as unknown as (EventClient & { client: Client })[], rule.audience)
    for (const ec of targets) {
      const prefs = ec.notification_prefs as { channels: NotificationChannel[]; language: string } | null
      const prefChannels: NotificationChannel[] = prefs?.channels ?? ['email', 'portal']
      const lang = prefs?.language ?? 'pt'
      for (const ch of rule.channels) {
        if (prefChannels.includes(ch)) templateKeys.add(`${ch}:${lang}`)
      }
    }
  }

  const templateCache = new Map<string, MessageTemplate>()
  if (templateKeys.size > 0) {
    const pairs = [...templateKeys].map(k => k.split(':'))
    const channels = [...new Set(pairs.map(([ch]) => ch))]
    const languages = [...new Set(pairs.map(([, lang]) => lang))]

    // Scoped to checklist_complete to avoid picking up other templates at same (org, channel, lang)
    const { data: templates } = await supabase
      .from('message_templates')
      .select('*')
      .eq('organization_id', ctx.event.organization_id)
      .eq('template_key', 'checklist_complete')
      .in('channel', channels)
      .in('language', languages)
      .eq('is_active', true)

    for (const t of templates ?? []) {
      templateCache.set(`${t.channel}:${t.language}`, t as MessageTemplate)
    }
  }

  const { NEXT_PUBLIC_APP_URL: appUrl } = getEnv()

  type JobDraft = Parameters<typeof insertAndEnqueue>[1][number]
  const jobDrafts: JobDraft[] = []

  for (const rule of rules) {
    const targetClients = filterClientsByAudience(eventClients as unknown as (EventClient & { client: Client })[], rule.audience)

    for (const ec of targetClients) {
      const client = ec.client
      const prefs = ec.notification_prefs as { channels: NotificationChannel[]; language: string } | null
      const prefChannels: NotificationChannel[] = prefs?.channels ?? ['email', 'portal']
      const lang = prefs?.language ?? 'pt'
      const channels = rule.channels.filter(ch => prefChannels.includes(ch))

      for (const channel of channels) {
        const msgTemplate = templateCache.get(`${channel}:${lang}`)
        if (!msgTemplate) continue

        const templateVars = {
          client_name: client.full_name,
          event_name: ctx.event.name,
          event_date: eventDate,
          item_client_label: ctx.item.client_label ?? ctx.item.title,
          completion_note: ctx.item.completion_note ?? '',
          portal_url: portalUrl,
          progress_percent: String(progressPercent),
        }

        jobDrafts.push({
          event_id: ctx.event.id,
          checklist_item_id: ctx.item.id,
          client_id: client.id,
          channel: channel as 'email' | 'whatsapp' | 'sms' | 'portal',
          message_template_id: msgTemplate.id,
          rendered_subject: msgTemplate.subject ? renderTemplate(msgTemplate.subject, templateVars) : null,
          rendered_body: renderTemplate(msgTemplate.body_template, templateVars),
          status: 'queued' as const,
          scheduled_at: rule.delay_minutes > 0
            ? new Date(Date.now() + rule.delay_minutes * 60 * 1000).toISOString()
            : new Date().toISOString(),
          _client: client as unknown as Client,
          _delay_minutes: rule.delay_minutes,
        })
      }
    }
  }

  await insertAndEnqueue(supabase, jobDrafts, ctx.event.id, appUrl)
}

interface StartDispatchContext {
  event: Event
  item: EventChecklistItem
}

export async function dispatchStartNotificationForItem(ctx: StartDispatchContext): Promise<void> {
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

  // Collect (channel, language) pairs needed for template lookup
  const templateKeys = new Set<string>()
  const hardcodedChannels: NotificationChannel[] = ['email', 'portal', 'sms']
  for (const ec of eventClients as unknown as (EventClient & { client: Client })[]) {
    const prefs = ec.notification_prefs as { channels: NotificationChannel[]; language: string } | null
    const prefChannels: NotificationChannel[] = prefs?.channels ?? ['email', 'portal']
    const lang = prefs?.language ?? 'pt'
    for (const ch of hardcodedChannels) {
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
      .eq('template_key', 'checklist_start')
      .in('channel', channels)
      .in('language', languages)
      .eq('is_active', true)

    for (const t of templates ?? []) {
      templateCache.set(`${t.channel}:${t.language}`, t as MessageTemplate)
    }
  }

  type StartJobDraft = {
    event_id: string
    checklist_item_id: string
    client_id: string
    channel: 'email' | 'whatsapp' | 'sms' | 'portal'
    message_template_id: string
    rendered_subject: string | null
    rendered_body: string
    status: 'queued'
    scheduled_at: string
    _client: Client
  }

  const jobDrafts: StartJobDraft[] = []

  for (const ec of eventClients as unknown as (EventClient & { client: Client })[]) {
    const client = ec.client
    const prefs = ec.notification_prefs as { channels: NotificationChannel[]; language: string } | null
    const prefChannels: NotificationChannel[] = prefs?.channels ?? ['email', 'portal']
    const lang = prefs?.language ?? 'pt'
    const channels = hardcodedChannels.filter(ch => prefChannels.includes(ch))

    for (const channel of channels) {
      const msgTemplate = templateCache.get(`${channel}:${lang}`)
      if (!msgTemplate) continue

      const templateVars = {
        client_name: client.full_name,
        event_name: ctx.event.name,
        event_date: eventDate,
        item_client_label: ctx.item.client_label ?? ctx.item.title,
        portal_url: portalUrl,
      }

      const renderedSubject = msgTemplate.subject
        ? renderTemplate(msgTemplate.subject, templateVars)
        : null
      const renderedBody = renderTemplate(msgTemplate.body_template, templateVars)

      jobDrafts.push({
        event_id: ctx.event.id,
        checklist_item_id: ctx.item.id,
        client_id: client.id,
        channel: channel as 'email' | 'whatsapp' | 'sms' | 'portal',
        message_template_id: msgTemplate.id,
        rendered_subject: renderedSubject,
        rendered_body: renderedBody,
        status: 'queued' as const,
        scheduled_at: new Date().toISOString(),
        _client: client as unknown as Client,
      })
    }
  }

  const { NEXT_PUBLIC_APP_URL: appUrl } = getEnv()
  await insertAndEnqueue(supabase, jobDrafts, ctx.event.id, appUrl)
}

// "specific_clients" targets primary contacts only — the audience rule means
// "the client(s) directly responsible for this event", not a generic subset.
function filterClientsByAudience(
  clients: (EventClient & { client: Client })[],
  audience: NotificationRule['audience']
): (EventClient & { client: Client })[] {
  switch (audience) {
    case 'all_clients':      return clients
    case 'vip_only':         return clients.filter(ec => ec.role === 'vip')
    case 'specific_clients': return clients.filter(ec => ec.role === 'primary_contact')
    default:                 return clients
  }
}
