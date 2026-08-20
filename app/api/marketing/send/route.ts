import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyQStashSignature } from '@/lib/qstash/verify'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendMarketingEmail } from '@/lib/marketing/smtp'
import { renderTemplate, injectTracking } from '@/lib/marketing/render'
import { getEnv } from '@/lib/env'

const payloadSchema = z.object({
  send_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  contact_id: z.string().uuid(),
  sender_user_id: z.string().uuid(),
  is_followup: z.boolean().optional().default(false),
  followup_subject: z.string().nullable().optional(),
  followup_body: z.string().nullable().optional(),
})

export async function POST(request: Request) {
  const clonedForSig = request.clone()
  const clonedForBody = request.clone()

  if (!await verifyQStashSignature(clonedForSig)) {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
  }

  const parsed = payloadSchema.safeParse(await clonedForBody.json())
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })

  const { send_id, campaign_id, contact_id, sender_user_id, is_followup, followup_subject, followup_body } = parsed.data
  const supabase = createAdminClient()
  const appUrl = getEnv().NEXT_PUBLIC_APP_URL

  // QStash garante at-least-once delivery: um retry depois do envio ja ter
  // tido sucesso (mas antes deste worker responder 200) reenviaria o mesmo
  // email ao contacto. Gate atomico sem nova coluna/estado: sent_at so e
  // preenchido no fim de um envio bem sucedido, por isso reclamar a linha
  // marcando-a com um sent_at provisorio (substituido no update final) so
  // funciona se ainda estiver null.
  const { data: claimed } = await supabase
    .from('marketing_sends')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', send_id)
    .is('sent_at', null)
    .select('id')
    .maybeSingle()

  if (!claimed) {
    return NextResponse.json({ success: true, skipped: 'already-processed' })
  }

  try {
    const [{ data: campaign }, { data: contact }, { data: smtpCreds }] = await Promise.all([
      supabase.from('marketing_campaigns').select('*').eq('id', campaign_id).single(),
      supabase.from('marketing_contacts').select('*').eq('id', contact_id).single(),
      supabase.from('team_smtp_credentials').select('*').eq('user_id', sender_user_id).single(),
    ])

    if (!campaign || !contact || !smtpCreds) {
      throw new Error('Missing required data')
    }

    // Warmup check: rate limit per sender based on account age
    const { data: warmupRaw } = await supabase.rpc('marketing_check_warmup_limit', {
      p_user_id: sender_user_id,
    })
    const warmup = warmupRaw as { allowed: boolean; daily_limit: number } | null
    if (warmup && !warmup.allowed) {
      throw new Error(`Limite diário atingido (${warmup.daily_limit}/dia durante warmup). Tente amanhã.`)
    }

    const vars = {
      nome: contact.name ?? '',
      empresa: contact.company ?? '',
      cargo: contact.role ?? '',
    }

    const subject = is_followup && followup_subject
      ? renderTemplate(followup_subject, vars)
      : renderTemplate(campaign.subject_template, vars)

    const bodyHtml = is_followup && followup_body
      ? renderTemplate(followup_body, vars)
      : renderTemplate(campaign.body_template, vars)

    const htmlWithTracking = injectTracking(bodyHtml, send_id, appUrl)

    const unsubscribeUrl = `${appUrl}/api/marketing/unsubscribe?sid=${send_id}`
    const messageId = await sendMarketingEmail({
      credentials: smtpCreds,
      to: contact.email,
      subject,
      html: htmlWithTracking,
      unsubscribeUrl,
      replyTo: smtpCreds.username,
    })

    await supabase.from('marketing_sends').update({
      status: 'sent',
      subject_rendered: subject,
      body_rendered: htmlWithTracking,
      sent_at: new Date().toISOString(),
      message_id: messageId,
    }).eq('id', send_id)

    await supabase.rpc('marketing_record_send', { p_user_id: sender_user_id })

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabase.from('marketing_sends').update({
      status: 'failed',
      error: msg,
      sent_at: null, // liberta a reclamacao (sent_at) para uma retry poder reenviar
    }).eq('id', send_id)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
