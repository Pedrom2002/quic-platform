import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('organizations').select('id').limit(1)
    if (error) throw error

    return NextResponse.json({ status: 'ok', db: 'ok', timestamp: new Date().toISOString() })
  } catch (e) {
    return NextResponse.json(
      { status: 'error', db: 'unreachable', message: e instanceof Error ? e.message : 'unknown' },
      { status: 503 }
    )
  }
}
