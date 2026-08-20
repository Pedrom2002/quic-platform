import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'
import { hasValidMxRecord } from '@/lib/email-validation'
import { FIXED_ORG_ID } from '@/lib/investors/constants'
import { signupSchema } from '@/lib/login-schemas'

const SIGNUP_LIMIT = 5
const SIGNUP_WINDOW_MS = 10 * 60 * 1_000

const schema = signupSchema.extend({
  fullName: z.string().min(1),
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

  if (!(await hasValidMxRecord(parsed.data.email))) {
    return NextResponse.json({ error: 'Dados inválidos. Verifica o formulário.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error: signUpError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  let userId = data.user?.id

  if (signUpError || !userId) {
    // A conta pode já existir órfã: um signup anterior criou o utilizador
    // Auth mas falhou antes (ou durante) o insert em `investors`. Se as
    // credenciais batem, recupera-se o registo em vez de bloquear o utilizador.
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })

    if (signInError || !signInData.user) {
      return NextResponse.json(
        { error: 'Não foi possível criar a conta. Verifica os dados ou tenta iniciar sessão.' },
        { status: 400 }
      )
    }

    userId = signInData.user.id
  }

  const { data: existingInvestor } = await supabase
    .from('investors')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (existingInvestor) {
    return NextResponse.json({ ok: true })
  }

  const { error: insertError } = await supabase.from('investors').insert({
    auth_user_id: userId,
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
