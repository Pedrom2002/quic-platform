import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidAdminToken } from '@/lib/portugal-auth'

export async function GET(request: Request) {
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
