import { NextResponse } from 'next/server'
import { getEnv } from '@/lib/env'
import { isValidCronAuth } from '@/lib/cron-auth'
import { runBouncePoll } from '@/lib/marketing/maintenance'

// Standalone bounce-poll endpoint (manual/QStash triggering). On Vercel Hobby
// the scheduled run is bundled into /api/cron/marketing-maintenance (≤2 crons).
export async function GET(request: Request) {
  if (!isValidCronAuth(request.headers.get('authorization'), getEnv().CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json(await runBouncePoll())
}
