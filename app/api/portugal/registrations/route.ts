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

  const adminToken = request.headers.get('x-admin-token')
  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const [portugal, goalfest] = await Promise.all([
    supabase
      .from('portugal_registrations')
      .select('name, email, phone, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('goalfest_registrations')
      .select('name, email, phone, created_at')
      .order('created_at', { ascending: false }),
  ])

  if (portugal.error || goalfest.error) {
    return NextResponse.json({ error: 'Erro ao carregar registos.' }, { status: 500 })
  }

  return NextResponse.json({
    portugal: portugal.data ?? [],
    goalfest: goalfest.data ?? [],
  })
}
