import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEnv } from '@/lib/env'
import crypto from 'crypto'

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('svix-signature') ?? ''
  const timestamp = request.headers.get('svix-timestamp') ?? ''
  const id = request.headers.get('svix-id') ?? ''

  // Verificar assinatura HMAC do Resend — obrigatório
  const secret = getEnv().RESEND_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Webhook não configurado' }, { status: 503 })
  const toSign = `${id}.${timestamp}.${body}`
  const [, secretBytes] = secret.split('_')
  const key = Buffer.from(secretBytes ?? secret, 'base64')
  const expectedSig = crypto.createHmac('sha256', key).update(toSign).digest('base64')
  const expectedBuf = Buffer.from(expectedSig)
  const sigs = sig.split(' ').map(s => s.split(',')[1] ?? '')
  const valid = sigs.some(s => {
    const buf = Buffer.from(s)
    return buf.length === expectedBuf.length && crypto.timingSafeEqual(buf, expectedBuf)
  })
  if (!valid) return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })

  const payload = JSON.parse(body)
  const supabase = createAdminClient()

  // Guardar webhook para processamento
  await supabase.from('webhook_events').insert({
    source: 'resend' as const,
    event_type: payload.type as string,
    payload: payload as unknown as import('@/types/database').Json,
  })

  // NOTA: este webhook recebe eventos do Resend (svix-signature,
  // RESEND_WEBHOOK_SECRET), mas o envio real de email transacional é feito
  // via Brevo (ver lib/notifications/channels/email.ts, provider_message_id
  // gravado como provider='brevo' pelo worker em
  // app/api/workers/send-notification/route.ts). O email_id deste payload
  // é um ID do Resend — nunca corresponde a um provider_message_id da Brevo,
  // pelo que o matching por email_id nunca encontraria o job correto e foi
  // removido (tentá-lo apenas mascarava que o tracking de entrega/abertura
  // não está ligado a nenhum provider real). O evento fica registado em
  // webhook_events para auditoria/depuração manual.
  console.warn('[webhooks/resend] evento recebido sem provider correspondente configurado', {
    type: payload.type,
  })

  return NextResponse.json({ received: true })
}
