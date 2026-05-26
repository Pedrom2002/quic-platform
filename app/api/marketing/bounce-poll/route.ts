import { NextResponse } from 'next/server'
import { verifyQStashSignature } from '@/lib/qstash/verify'
import { createAdminClient } from '@/lib/supabase/admin'
import { pollBounces } from '@/lib/marketing/imap'
import { SCORE_DELTA } from '@/lib/marketing/scoring'

export async function POST(request: Request) {
  const clonedForSig = request.clone()
  if (!await verifyQStashSignature(clonedForSig)) {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)

  const { data: activeSenders } = await supabase
    .from('marketing_campaigns')
    .select('created_by')
    .in('status', ['sending', 'sent'])

  if (!activeSenders?.length) return NextResponse.json({ processed: 0 })

  const uniqueSenderIds = [...new Set(activeSenders.map(r => r.created_by))]

  let totalBounces = 0

  for (const userId of uniqueSenderIds) {
    const { data: creds } = await supabase
      .from('team_smtp_credentials')
      .select('host, username, password_enc')
      .eq('user_id', userId)
      .single()

    if (!creds) continue

    try {
      const bounces = await pollBounces(creds, since)

      for (const bounce of bounces) {
        const { data: contact } = await supabase
          .from('marketing_contacts')
          .select('id')
          .eq('email', bounce.bouncedEmail)
          .maybeSingle()

        if (!contact) continue

        await Promise.all([
          supabase.from('marketing_sends')
            .update({ status: 'bounced' })
            .eq('contact_id', contact.id)
            .eq('status', 'sent'),
          supabase.from('marketing_contacts')
            .update({ status: 'bounced' })
            .eq('id', contact.id),
          supabase.rpc('marketing_increment_score', {
            p_contact_id: contact.id,
            p_delta: SCORE_DELTA.bounced,
          }),
        ])

        totalBounces++
      }
    } catch (err) {
      console.error(`[bounce-poll] IMAP error for user ${userId}:`, err)
    }
  }

  return NextResponse.json({ processed: totalBounces })
}
