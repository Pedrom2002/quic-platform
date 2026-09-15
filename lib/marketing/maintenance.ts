import { createAdminClient } from '@/lib/supabase/admin'
import { pollBounces } from '@/lib/marketing/imap'
import { SCORE_DELTA } from '@/lib/marketing/scoring'

// Marketing maintenance tasks, extracted so they can run both standalone
// (their own routes, for manual/QStash triggering) and bundled in the single
// daily /api/cron/marketing-maintenance cron (Vercel Hobby allows ≤2 crons).

export async function runBouncePoll(): Promise<{ processed: number }> {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)

  const { data: activeSenders } = await supabase
    .from('marketing_campaigns')
    .select('created_by')
    .in('status', ['sending', 'sent'])

  if (!activeSenders?.length) return { processed: 0 }

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
      if (!bounces.length) continue

      // Batch the contact lookup once per sender instead of one SELECT per
      // bounce (real N+1: a mailbox with 50 bounces did 50 sequential
      // round-trips just to resolve email -> contact id).
      const bouncedEmails = [...new Set(bounces.map(b => b.bouncedEmail))]
      const { data: contacts } = await supabase
        .from('marketing_contacts')
        .select('id, email')
        .in('email', bouncedEmails)

      // email is only unique per list (UNIQUE(list_id, email)), so the same
      // address can map to multiple contact rows across different lists -
      // all of them should be marked bounced, not just one.
      const contactIdsByEmail = new Map<string, string[]>()
      for (const c of contacts ?? []) {
        contactIdsByEmail.set(c.email, (contactIdsByEmail.get(c.email) ?? []).concat(c.id))
      }

      const matched = bounces.flatMap(b => contactIdsByEmail.get(b.bouncedEmail) ?? [])

      await Promise.all(
        matched.flatMap(contactId => [
          supabase.from('marketing_sends')
            .update({ status: 'bounced' })
            .eq('contact_id', contactId)
            .eq('status', 'sent'),
          supabase.from('marketing_contacts')
            .update({ status: 'bounced' })
            .eq('id', contactId),
          supabase.rpc('marketing_increment_score', {
            p_contact_id: contactId,
            p_delta: SCORE_DELTA.bounced,
          }),
        ])
      )

      totalBounces += matched.length
    } catch (err) {
      console.error(`[bounce-poll] IMAP error for user ${userId}:`, err)
    }
  }

  return { processed: totalBounces }
}
