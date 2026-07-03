import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidAdminToken } from '@/lib/portugal-auth'

export async function GET(request: Request) {
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
