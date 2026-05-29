import { NextResponse } from 'next/server'
import { getEnv } from '@/lib/env'
import { isValidCronAuth } from '@/lib/cron-auth'
import { runMarketingFollowup, runBouncePoll } from '@/lib/marketing/maintenance'

// Single daily marketing-maintenance cron (Vercel Hobby allows ≤2 crons / daily).
// Runs campaign follow-ups and IMAP bounce polling in one pass.
export async function GET(request: Request) {
  if (!isValidCronAuth(request.headers.get('authorization'), getEnv().CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const followup = await runMarketingFollowup()
  const bounce = await runBouncePoll()
  return NextResponse.json({ followup, bounce })
}
