import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEnv } from '@/lib/env'
import { isValidCronAuth } from '@/lib/cron-auth'
import { sendEmail, buildEmailHtml } from '@/lib/notifications/channels/email'
import { sendSms } from '@/lib/notifications/channels/sms'
import type { NotificationJobPayload } from '@/types/app'

export async function GET(request: Request) {
  let cronSecret: string, qstashToken: string | undefined, appUrl: string
  try {
    ;({ CRON_SECRET: cronSecret, QSTASH_TOKEN: qstashToken, NEXT_PUBLIC_APP_URL: appUrl } = getEnv())
  } catch {
    return NextResponse.json({ error: 'Configuração inválida' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (!isValidCronAuth(authHeader, cronSecret)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const BATCH_SIZE = 50

  // Claim atómico (FOR UPDATE SKIP LOCKED no lado da BD): garante que execuções
  // concorrentes nunca processam o mesmo job → sem envios duplicados.
  type ClaimedJob = {
    id: string
    event_id: string
    client_id: string
    channel: string
    rendered_subject: string | null
    rendered_body: string
  }
  const claim = await supabase.rpc('claim_notification_jobs', { p_batch_size: BATCH_SIZE })
  const fetchErr = claim.error
  const jobs = (claim.data ?? null) as ClaimedJob[] | null

  if (fetchErr) {
    console.error('[cron] erro ao reclamar jobs:', fetchErr.message)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }

  if (!jobs?.length) {
    return NextResponse.json({ processed: 0, hasMore: false })
  }

  // Sobraram jobs prontos para a próxima execução?
  const { count: remaining } = await supabase
    .from('notification_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'queued')
    .is('qstash_message_id', null)
    .lte('scheduled_at', new Date().toISOString())
  const hasMore = (remaining ?? 0) > 0

  if (hasMore) {
    console.warn(`[cron] ainda há ${remaining} jobs pendentes após este lote`)
  }

  const clientIds = [...new Set(jobs.map(j => j.client_id))]
  const { data: clientsRaw } = await supabase
    .from('clients')
    .select('id, email, full_name, phone, whatsapp')
    .in('id', clientIds)

  const clientMap = new Map((clientsRaw ?? []).map(c => [c.id, c]))

  let processed = 0
  let failed = 0

  if (qstashToken) {
    const { Client: QStashClient } = await import('@upstash/qstash')
    const qstash = new QStashClient({ token: qstashToken })
    const workerUrl = `${appUrl}/api/workers/send-notification`

    const results = await Promise.allSettled(
      jobs.map(async job => {
        const client = clientMap.get(job.client_id)
        const payload: NotificationJobPayload = {
          job_id: job.id,
          event_id: job.event_id,
          client_id: job.client_id,
          channel: job.channel as NotificationJobPayload['channel'],
          rendered_subject: job.rendered_subject,
          rendered_body: job.rendered_body,
          client_email: client?.email ?? null,
          client_phone: client?.phone ?? null,
          client_whatsapp: client?.whatsapp ?? null,
        }

        const res = await qstash.publishJSON({ url: workerUrl, body: payload, retries: 3 })

        // Mantém status 'processing' + grava o message id; o worker
        // (/api/workers/send-notification) move para 'delivered'/'failed'.
        // NÃO voltar a 'queued' — seria re-reclamado pelo próximo cron.
        await supabase
          .from('notification_jobs')
          .update({ qstash_message_id: res.messageId })
          .eq('id', job.id)
      })
    )

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      if (result.status === 'fulfilled') {
        processed++
      } else {
        failed++
        const msg = result.reason instanceof Error ? result.reason.message : String(result.reason)
        console.error(`[cron] falha ao enfileirar job ${jobs[i].id}:`, msg)
        await supabase
          .from('notification_jobs')
          .update({ status: 'failed', last_error: msg })
          .eq('id', jobs[i].id)
      }
    }
  } else {
    // No QStash: dispatch directly via Brevo
    const eventIds = [...new Set(jobs.map(j => j.event_id))]
    const { data: eventsRaw } = await supabase
      .from('events')
      .select('id, name')
      .in('id', eventIds)
    const eventMap = new Map((eventsRaw ?? []).map(e => [e.id, e]))

    const results = await Promise.allSettled(
      jobs.map(async job => {
        const client = clientMap.get(job.client_id)
        const event = eventMap.get(job.event_id)

        try {
          let providerId: string | null = null

          if (job.channel === 'email') {
            if (!client?.email) throw new Error('Email do cliente em falta')
            const html = buildEmailHtml(job.rendered_body, event?.name ?? '')
            providerId = await sendEmail({
              to: client.email,
              toName: client.full_name,
              subject: job.rendered_subject ?? 'Atualização do seu evento — Quic',
              html,
            })
          } else if (job.channel === 'sms') {
            if (!client?.phone) throw new Error('Telefone do cliente em falta')
            providerId = await sendSms({
              to: client.phone,
              message: job.rendered_body,
            })
          } else {
            // portal and others: mark delivered (passive channel)
            await supabase
              .from('notification_jobs')
              .update({ status: 'delivered', sent_at: new Date().toISOString() })
              .eq('id', job.id)
            return
          }

          await Promise.all([
            supabase
              .from('notification_jobs')
              .update({ status: 'delivered', sent_at: new Date().toISOString() })
              .eq('id', job.id),
            supabase.from('notification_log').insert({
              notification_job_id: job.id,
              event_type: 'sent',
              channel: job.channel,
              provider: 'brevo',
              provider_message_id: providerId,
            }),
          ])
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`[cron] falha ao enviar job ${job.id}:`, msg)
          await supabase
            .from('notification_jobs')
            .update({ status: 'failed', last_error: msg })
            .eq('id', job.id)
          throw err
        }
      })
    )

    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'fulfilled') {
        processed++
      } else {
        failed++
      }
    }
  }

  return NextResponse.json({ processed, failed, hasMore })
}
