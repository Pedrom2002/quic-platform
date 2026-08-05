import { NextResponse } from 'next/server'
import { verifyQStashSignature } from '@/lib/qstash/verify'
import { createAdminClient } from '@/lib/supabase/admin'
import { pollReplies } from '@/lib/marketing/imap'
import { SCORE_DELTA } from '@/lib/marketing/scoring'

export async function POST(request: Request) {
  const cloned = request.clone()
  if (!await verifyQStashSignature(cloned)) {
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
  let totalReplies = 0

  for (const userId of uniqueSenderIds) {
    const { data: creds } = await supabase
      .from('team_smtp_credentials')
      .select('host, username, password_enc')
      .eq('user_id', userId)
      .single()

    if (!creds) continue

    try {
      const replies = await pollReplies(creds, since)

      for (const reply of replies) {
        const candidates = [reply.inReplyTo, ...reply.references].filter(Boolean)
        if (!candidates.length) continue

        const { data: send } = await supabase
          .from('marketing_sends')
          .select('id, contact_id, replied_at')
          .in('message_id', candidates)
          .maybeSingle()

        if (!send || send.replied_at) continue

        await supabase.from('marketing_sends').update({
          status: 'replied',
          replied_at: reply.receivedAt.toISOString(),
          reply_snippet: reply.snippet,
        }).eq('id', send.id)

        await supabase.rpc('marketing_increment_score', {
          p_contact_id: send.contact_id,
          p_delta: SCORE_DELTA.replied,
        })

        totalReplies++
      }
    } catch (err) {
      console.error(`[reply-poll] IMAP error for user ${userId}:`, err)
    }
  }

  return NextResponse.json({ processed: totalReplies })
}
