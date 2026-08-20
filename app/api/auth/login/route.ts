import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'
import { loginSchema as schema } from '@/lib/login-schemas'

const LOGIN_LIMIT = 10
const LOGIN_WINDOW_MS = 15 * 60 * 1_000

export async function POST(request: Request) {
  const ip = getClientIp(request)
  if (await isRateLimited(`login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS)) {
    return NextResponse.json({ error: 'Demasiadas tentativas. Tenta novamente mais tarde.' }, { status: 429 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email ou password inválidos.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    return NextResponse.json({ error: 'Email ou password inválidos.' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
