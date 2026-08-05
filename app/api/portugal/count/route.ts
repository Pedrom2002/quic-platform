import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidAdminToken } from '@/lib/portugal-auth'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'

const ADMIN_LIMIT = 20
const ADMIN_WINDOW_MS = 5 * 60 * 1_000

export async function GET(request: Request) {
  const ip = getClientIp(request)
  if (await isRateLimited(`portugal-admin:${ip}`, ADMIN_LIMIT, ADMIN_WINDOW_MS)) {
    return NextResponse.json({ error: 'Demasiadas tentativas. Tenta novamente mais tarde.' }, { status: 429 })
  }

  const token = request.headers.get('x-admin-token')
  if (!isValidAdminToken(token)) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { count, error } = await supabase
    .from('portugal_registrations')
    .select('id', { count: 'exact', head: true })

  if (error) {
    return NextResponse.json({ error: 'Erro ao contar registos.' }, { status: 500 })
  }

  return NextResponse.json({ count: count ?? 0 })
}
