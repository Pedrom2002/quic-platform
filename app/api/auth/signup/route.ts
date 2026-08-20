import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'
import { hasValidMxRecord } from '@/lib/email-validation'
import { signupSchema as schema } from '@/lib/login-schemas'

const SIGNUP_LIMIT = 5
const SIGNUP_WINDOW_MS = 10 * 60 * 1_000

export async function POST(request: Request) {
  const ip = getClientIp(request)
  if (await isRateLimited(`signup:${ip}`, SIGNUP_LIMIT, SIGNUP_WINDOW_MS)) {
    return NextResponse.json({ error: 'Demasiadas tentativas. Tenta novamente mais tarde.' }, { status: 429 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email ou password inválidos.' }, { status: 400 })
  }

  if (!(await hasValidMxRecord(parsed.data.email))) {
    return NextResponse.json({ error: 'Email ou password inválidos.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp(parsed.data)

  if (error) {
    return NextResponse.json(
      { error: 'Não foi possível criar a conta. Verifica os dados ou tenta iniciar sessão.' },
      { status: 400 }
    )
  }

  return NextResponse.json({ ok: true })
}
