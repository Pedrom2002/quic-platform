import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Client as QStashClient } from '@upstash/qstash'
import { getEnv } from '@/lib/env'
import type { NotificationJobPayload } from '@/types/app'

export async function GET(request: Request) {
  let cronSecret: string, qstashToken: string | undefined, appUrl: string
  try {
    ;({ CRON_SECRET: cronSecret, QSTASH_TOKEN: qstashToken, NEXT_PUBLIC_APP_URL: appUrl } = getEnv())
  } catch {
    return NextResponse.json({ error: 'Configuração inválida' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  if (!qstashToken) {
    // QStash não configurado: o dispatcher envia emails síncronamente, pelo que
    // nenhum job fica em 'queued' à espera do cron. No-op em vez de 500 evita
    // que o cron diário da Vercel falhe permanentemente.
    return NextResponse.json({ processed: 0, hasMore: false, skipped: true })
  }

  const supabase = createAdminClient()
  const qstash = new QStashClient({ token: qstashToken })

  const BATCH_SIZE = 50

  // Fetch one extra row to detect whether more jobs remain after this batch.
  const { data: jobsRaw, error: fetchErr } = await supabase
    .from('notification_jobs')
    .select('id, event_id, client_id, channel, rendered_subject, rendered_body, qstash_message_id')
    .eq('status', 'queued')
    .is('qstash_message_id', null)
    .lte('scheduled_at', new Date().toISOString())
    .limit(BATCH_SIZE + 1)

  if (fetchErr) {
    console.error('[cron] erro ao buscar jobs:', fetchErr.message)
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  if (!jobsRaw?.length) {
    return NextResponse.json({ processed: 0, hasMore: false })
  }

  const hasMore = jobsRaw.length > BATCH_SIZE
  const jobs = hasMore ? jobsRaw.slice(0, BATCH_SIZE) : jobsRaw

  if (hasMore) {
    console.warn(`[cron] fila tem mais de ${BATCH_SIZE} jobs pendentes — considerar aumentar BATCH_SIZE ou executar cron com mais frequência`)
  }

  const jobIds = jobs.map(j => j.id)

  // Mark all claimed jobs as 'processing' before dispatching — idempotency guard
  const { error: claimErr } = await supabase
    .from('notification_jobs')
    .update({ status: 'processing' as unknown as 'queued' })
    .in('id', jobIds)
    .eq('status', 'queued')

  if (claimErr) {
    console.error('[cron] erro ao reclamar jobs:', claimErr.message)
    return NextResponse.json({ error: claimErr.message }, { status: 500 })
  }

  const clientIds = [...new Set(jobs.map(j => j.client_id))]
  const { data: clientsRaw } = await supabase
    .from('clients')
    .select('id, email, phone, whatsapp')
    .in('id', clientIds)

  const clientMap = new Map((clientsRaw ?? []).map(c => [c.id, c]))
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

      await supabase
        .from('notification_jobs')
        .update({ status: 'queued', qstash_message_id: res.messageId })
        .eq('id', job.id)
    })
  )

  let processed = 0
  let failed = 0

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

  return NextResponse.json({ processed, failed, hasMore })
}
