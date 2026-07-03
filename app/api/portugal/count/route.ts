import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidAdminToken } from '@/lib/portugal-auth'

export async function GET(request: Request) {
  const token = request.headers.get('x-admin-token')
  if (!isValidAdminToken(token)) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { count } = await supabase
    .from('portugal_registrations')
    .select('id', { count: 'exact', head: true })

  return NextResponse.json({ count: count ?? 0 })
}
