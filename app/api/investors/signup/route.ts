import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'
import { FIXED_ORG_ID } from '@/lib/investors/constants'

const SIGNUP_LIMIT = 5
const SIGNUP_WINDOW_MS = 10 * 60 * 1_000

const schema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
})

export async function POST(request: Request) {
  const ip = getClientIp(request)
  if (await isRateLimited(`investor-signup:${ip}`, SIGNUP_LIMIT, SIGNUP_WINDOW_MS)) {
    return NextResponse.json({ error: 'Demasiadas tentativas. Tenta novamente mais tarde.' }, { status: 429 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos. Verifica o formulário.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error: signUpError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (signUpError || !data.user) {
    return NextResponse.json(
      { error: 'Não foi possível criar a conta. Verifica os dados ou tenta iniciar sessão.' },
      { status: 400 }
    )
  }

  const { error: insertError } = await supabase.from('investors').insert({
    auth_user_id: data.user.id,
    organization_id: FIXED_ORG_ID,
    full_name: parsed.data.fullName,
    email: parsed.data.email,
    phone: parsed.data.phone ?? null,
    status: 'pending',
  })

  if (insertError) {
    return NextResponse.json(
      { error: 'Conta criada mas houve um erro ao registar o perfil. Contacta-nos.' },
      { status: 400 }
    )
  }

  return NextResponse.json({ ok: true })
}
