import { NextResponse } from 'next/server'
import { verifyQStashSignature } from '@/lib/qstash/verify'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, buildEmailHtml } from '@/lib/notifications/channels/email'
import type { NotificationJobPayload } from '@/types/app'

export async function POST(request: Request) {
  const cloned = request.clone()
  const isValid = await verifyQStashSignature(cloned)

  if (!isValid) {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
  }

  const payload: NotificationJobPayload = await request.json()
  const supabase = createAdminClient()

  try {
    let providerId: string | null = null

    if (payload.channel === 'email') {
      if (!payload.client_email) throw new Error('Email do cliente em falta')

      const { data: event } = await supabase
        .from('events')
        .select('name')
        .eq('id', payload.event_id)
        .single()

      const html = buildEmailHtml(payload.rendered_body, event?.name)
      providerId = await sendEmail({
        to: payload.client_email,
        subject: payload.rendered_subject ?? 'Atualização do seu evento — Quic',
        html,
      })
    }

    await supabase
      .from('notification_jobs')
      .update({ status: 'delivered', sent_at: new Date().toISOString(), attempt_count: 1 })
      .eq('id', payload.job_id)

    await supabase.from('notification_log').insert({
      notification_job_id: payload.job_id,
      event_type: 'sent',
      channel: payload.channel,
      provider: payload.channel === 'email' ? 'brevo' : 'twilio',
      provider_message_id: providerId,
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[worker/send-notification]', msg)

    await supabase
      .from('notification_jobs')
      .update({ status: 'failed', last_error: msg })
      .eq('id', payload.job_id)

    await supabase.from('notification_log').insert({
      notification_job_id: payload.job_id,
      event_type: 'failed',
      channel: payload.channel,
      metadata: { error: msg },
    })

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
