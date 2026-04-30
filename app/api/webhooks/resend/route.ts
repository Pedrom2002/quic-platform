import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('svix-signature') ?? ''
  const timestamp = request.headers.get('svix-timestamp') ?? ''
  const id = request.headers.get('svix-id') ?? ''

  // Verificar assinatura HMAC do Resend — obrigatório
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.error('[webhook/resend] RESEND_WEBHOOK_SECRET não configurado')
    return NextResponse.json({ error: 'Webhook não configurado' }, { status: 500 })
  }
  const toSign = `${id}.${timestamp}.${body}`
  const [, secretBytes] = secret.split('_')
  const key = Buffer.from(secretBytes ?? secret, 'base64')
  const expectedSig = crypto.createHmac('sha256', key).update(toSign).digest('base64')
  const sigs = sig.split(' ').map(s => s.split(',')[1])
  const valid = sigs.some(s => s === expectedSig)
  if (!valid) return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })

  const payload = JSON.parse(body)
  const supabase = createAdminClient()

  // Guardar webhook para processamento
  await supabase.from('webhook_events').insert({
    source: 'resend' as const,
    event_type: payload.type as string,
    payload: payload as unknown as import('@/types/database').Json,
  })

  // Processar eventos de entrega
  const emailId = payload.data?.email_id as string | undefined
  const eventType = payload.type as string

  if (emailId) {
    const logEventType = eventType.includes('delivered') ? 'delivered'
      : eventType.includes('opened') ? 'opened'
      : eventType.includes('bounced') ? 'bounced'
      : null

    if (logEventType) {
      // Look up the job via notification_log where the Brevo message ID was
      // stored at send time by the worker (provider_message_id column).
      // Cannot use qstash_message_id — that holds the QStash message ID, not
      // the Brevo one.
      const { data: logEntry } = await supabase
        .from('notification_log')
        .select('notification_job_id')
        .eq('provider_message_id', emailId)
        .eq('provider', 'brevo')
        .limit(1)
        .maybeSingle()

      if (logEntry) {
        await supabase.from('notification_log').insert({
          notification_job_id: logEntry.notification_job_id,
          event_type: logEventType as 'delivered' | 'opened' | 'bounced',
          channel: 'email',
          provider: 'brevo',
          provider_message_id: emailId,
          metadata: payload.data as unknown as import('@/types/database').Json,
        })

        if (logEventType === 'delivered') {
          await supabase
            .from('notification_jobs')
            .update({ status: 'delivered' })
            .eq('id', logEntry.notification_job_id)
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
