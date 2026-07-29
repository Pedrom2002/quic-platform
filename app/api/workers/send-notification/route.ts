import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyQStashSignature } from '@/lib/qstash/verify'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, buildEmailHtml } from '@/lib/notifications/channels/email'
import { sendSms } from '@/lib/notifications/channels/sms'
import { sendPushNotifications } from '@/lib/notifications/channels/push'

const payloadSchema = z.object({
  job_id: z.string().min(1),
  event_id: z.string().min(1),
  client_id: z.string().min(1),
  channel: z.enum(['email', 'whatsapp', 'sms', 'portal', 'push']),
  rendered_subject: z.string().nullable(),
  rendered_body: z.string(),
  client_email: z.string().nullable(),
  client_phone: z.string().nullable(),
  client_whatsapp: z.string().nullable(),
})

export async function POST(request: Request) {
  const clonedForSig = request.clone()
  const clonedForBody = request.clone()
  const isValid = await verifyQStashSignature(clonedForSig)

  if (!isValid) {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
  }

  const parsed = payloadSchema.safeParse(await clonedForBody.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Payload inválido', issues: parsed.error.issues }, { status: 400 })
  }
  const payload = parsed.data
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
    } else if (payload.channel === 'sms') {
      if (!payload.client_phone) throw new Error('Telefone do cliente em falta')
      providerId = await sendSms({
        to: payload.client_phone,
        message: payload.rendered_body,
      })
    } else if (payload.channel === 'push') {
      const { data: tokens } = await supabase
        .from('client_push_tokens')
        .select('token')
        .eq('client_id', payload.client_id)

      if (tokens?.length) {
        const { data: event } = await supabase
          .from('events')
          .select('name')
          .eq('id', payload.event_id)
          .single()

        providerId = await sendPushNotifications({
          tokens: tokens.map(t => t.token),
          title: event?.name ?? 'Atualização do seu evento',
          body: payload.rendered_body,
        })
      }
    }

    await supabase
      .from('notification_jobs')
      .update({ status: 'delivered', sent_at: new Date().toISOString(), attempt_count: 1 })
      .eq('id', payload.job_id)

    await supabase.from('notification_log').insert({
      notification_job_id: payload.job_id,
      event_type: 'sent',
      channel: payload.channel,
      provider: payload.channel === 'email' || payload.channel === 'sms' ? 'brevo' : payload.channel === 'push' ? 'expo' : 'twilio',
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
