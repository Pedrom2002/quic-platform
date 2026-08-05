import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidAdminToken } from '@/lib/portugal-auth'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'

const schema = z.object({
  token: z.string().min(1),
})

type WinnerRow = {
  id: string
  redeemed_at: string | null
  portugal_registrations: { name: string } | null
}

const ADMIN_LIMIT = 20
const ADMIN_WINDOW_MS = 5 * 60 * 1_000

export async function POST(request: Request) {
  const ip = getClientIp(request)
  if (await isRateLimited(`portugal-admin:${ip}`, ADMIN_LIMIT, ADMIN_WINDOW_MS)) {
    return NextResponse.json({ error: 'Demasiadas tentativas. Tenta novamente mais tarde.' }, { status: 429 })
  }

  const adminToken = request.headers.get('x-admin-token')
  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Pedido invalido' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ valid: false, reason: 'not_found' })
  }

  const { token } = parsed.data
  const supabase = createAdminClient()

  // Atomic: so faz UPDATE se redeemed_at IS NULL
  const { data: updated } = await supabase
    .from('portugal_winners')
    .update({ redeemed_at: new Date().toISOString() })
    .eq('qr_token', token)
    .is('redeemed_at', null)
    .select('id, portugal_registrations(name)')
    .returns<WinnerRow[]>()

  if (updated && updated.length > 0) {
    const name = updated[0].portugal_registrations?.name ?? 'Vencedor'
    return NextResponse.json({ valid: true, name })
  }

  // Verificar se token existe mas ja foi usado
  const { data: existing } = await supabase
    .from('portugal_winners')
    .select('redeemed_at')
    .eq('qr_token', token)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ valid: false, reason: 'already_used' })
  }

  return NextResponse.json({ valid: false, reason: 'not_found' })
}
