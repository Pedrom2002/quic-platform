import { createAdminClient } from '@/lib/supabase/admin'
import { renderTemplate } from './template-renderer'
import { sendEmail, buildEmailHtml } from './channels/email'
import type { NotificationRule, NotificationChannel, NotificationJobPayload } from '@/types/app'
import type { EventChecklistItem, Event, Client, EventClient, MessageTemplate, NotificationJob } from '@/types/database'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { calcProgress } from '@/lib/event-status'

const useQStash = !!process.env.QSTASH_TOKEN

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

  // Collect all (channel, language) pairs needed to batch template lookups into one query
  const templateKeys = new Set<string>()
  for (const rule of rules) {
    const targets = filterClientsByAudience(eventClients as unknown as (EventClient & { client: Client })[], rule.audience)
    for (const ec of targets) {
      const prefs = ec.notification_prefs as { channels: NotificationChannel[]; language: string }
      const lang = prefs?.language ?? 'pt'
      for (const ch of rule.channels) {
        if (prefs?.channels?.includes(ch)) templateKeys.add(`${ch}:${lang}`)
      }
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
      .in('channel', channels)
      .in('language', languages)
      .eq('is_active', true)

    for (const t of templates ?? []) {
      templateCache.set(`${t.channel}:${t.language}`, t as MessageTemplate)
    }
  }

  // Instantiate QStash client once outside the loop
  let qstash: import('@upstash/qstash').Client | null = null
  if (useQStash) {
    const { Client: QStashClient } = await import('@upstash/qstash')
    const token = process.env.QSTASH_TOKEN
    if (!token) throw new Error('[dispatcher] QSTASH_TOKEN não configurado')
    qstash = new QStashClient({ token })
  }

  const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/workers/send-notification`

  // Build all jobs to insert in one batch
  type JobDraft = {
    event_id: string
    checklist_item_id: string
    client_id: string
    channel: 'email' | 'whatsapp' | 'sms' | 'portal'
    message_template_id: string
    rendered_subject: string | null
    rendered_body: string
    status: 'queued'
    scheduled_at: string
    // carry-along for dispatch step (not inserted)
    _client: Client
    _rule: NotificationRule
  }

  const jobDrafts: JobDraft[] = []

  for (const rule of rules) {
    const targetClients = filterClientsByAudience(eventClients as unknown as (EventClient & { client: Client })[], rule.audience)

    for (const ec of targetClients) {
      const client = ec.client
      const prefs = ec.notification_prefs as { channels: NotificationChannel[]; language: string }
      const lang = prefs?.language ?? 'pt'
      const channels = rule.channels.filter(ch => prefs?.channels?.includes(ch))

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
          scheduled_at: rule.delay_minutes > 0
            ? new Date(Date.now() + rule.delay_minutes * 60 * 1000).toISOString()
            : new Date().toISOString(),
          _client: client as unknown as Client,
          _rule: rule,
        })
      }
    }
  }

  if (jobDrafts.length === 0) return

  // Insert all jobs in one batch
  const { data: insertedJobs, error: insertError } = await supabase
    .from('notification_jobs')
    .insert(jobDrafts.map(({ _client: _c, _rule: _r, ...row }) => row))
    .select()

  if (insertError || !insertedJobs?.length) {
    console.error('[dispatcher] falha ao inserir jobs:', insertError?.message)
    return
  }

  // Build a lookup map from the natural composite key to the draft.
  // Supabase does not guarantee insert order matches input order, so
  // indexing by position is unsafe — use the unique (client_id, channel,
  // checklist_item_id) tuple instead.
  type DraftKey = string
  const draftByKey = new Map<DraftKey, (typeof jobDrafts)[number]>()
  for (const draft of jobDrafts) {
    draftByKey.set(`${draft.client_id}:${draft.channel}:${draft.checklist_item_id}`, draft)
  }

  // Dispatch all jobs in parallel
  await Promise.allSettled(
    insertedJobs.map(async (jobRow) => {
      const job = jobRow as NotificationJob
      // checklist_item_id is always set for jobs created by this dispatcher
      const key = `${job.client_id}:${job.channel}:${job.checklist_item_id ?? ''}`
      const draft = draftByKey.get(key)
      if (!draft) {
        console.error('[dispatcher] draft não encontrado para job', job.id, key)
        await supabase
          .from('notification_jobs')
          .update({ status: 'failed', last_error: 'draft lookup failed after insert' })
          .eq('id', job.id)
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

          const qstashResponse = await qstash!.publishJSON({
            url: workerUrl,
            body: payload,
            ...(draft._rule.delay_minutes > 0 && { delay: draft._rule.delay_minutes * 60 }),
            retries: 3,
          })

          await Promise.all([
            supabase
              .from('notification_jobs')
              .update({ qstash_message_id: qstashResponse.messageId })
              .eq('id', job.id),
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
          console.error('[dispatcher:qstash]', msg)
          await supabase
            .from('notification_jobs')
            .update({ status: 'failed', last_error: msg })
            .eq('id', job.id)
        }
      } else {
        try {
          if (draft.channel === 'email' && draft._client.email) {
            const html = buildEmailHtml(draft.rendered_body, ctx.event.name, progressPercent)
            const providerId = await sendEmail({
              to: draft._client.email,
              toName: draft._client.full_name,
              subject: draft.rendered_subject ?? 'Atualização do seu evento — Quic',
              html,
            })
            await Promise.all([
              supabase
                .from('notification_jobs')
                .update({ status: 'delivered', sent_at: new Date().toISOString() })
                .eq('id', job.id),
              supabase.from('notification_log').insert({
                notification_job_id: job.id,
                event_type: 'sent' as const,
                channel: draft.channel,
                provider: 'brevo',
                provider_message_id: providerId,
              }),
            ])
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error('[dispatcher:direct]', msg)
          await supabase
            .from('notification_jobs')
            .update({ status: 'failed', last_error: msg })
            .eq('id', job.id)
        }
      }
    })
  )
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
