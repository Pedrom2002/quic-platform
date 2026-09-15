import { NextResponse } from 'next/server'
import { getEnv } from '@/lib/env'
import { isValidCronAuth } from '@/lib/cron-auth'
import { runBouncePoll } from '@/lib/marketing/maintenance'

// Daily marketing-maintenance cron. Runs IMAP bounce polling.
export async function GET(request: Request) {
  if (!isValidCronAuth(request.headers.get('authorization'), getEnv().CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const bounce = await runBouncePoll()
  return NextResponse.json({ bounce })
}
