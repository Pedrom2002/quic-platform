import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'

const REGISTER_LIMIT = 5
const REGISTER_WINDOW_MS = 10 * 60 * 1_000

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\s/g, '')
  if (digits.startsWith('+351')) return digits
  if (/^9\d{8}$/.test(digits)) return `+351${digits}`
  return digits
}

const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.email(),
  phone: z.string().regex(/^(\+351)?9\d{8}$/, 'Telemovel invalido (ex: 912345678)'),
  consent: z.literal(true, { message: 'Consentimento RGPD obrigatorio.' }),
})

export async function POST(request: Request) {
  const ip = getClientIp(request)
  if (await isRateLimited(`goalfest-register:${ip}`, REGISTER_LIMIT, REGISTER_WINDOW_MS)) {
    return NextResponse.json({ error: 'Demasiadas tentativas. Tenta novamente mais tarde.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Pedido invalido' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados invalidos' },
      { status: 422 }
    )
  }

  const { name, email, phone } = parsed.data
  const normalizedPhone = normalizePhone(phone)

  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('goalfest_registrations')
    .select('id, email, phone')
    .or(`email.eq.${email},phone.eq.${normalizedPhone}`)
    .maybeSingle()

  if (existing) {
    const field = existing.email === email ? 'email' : 'telemovel'
    return NextResponse.json(
      { error: `Este ${field} ja esta registado.` },
      { status: 409 }
    )
  }

  const consentAt = new Date().toISOString()

  const { error } = await supabase
    .from('goalfest_registrations')
    .insert({ name, email, phone: normalizedPhone, consent_at: consentAt })

  if (error) {
    return NextResponse.json({ error: 'Erro ao guardar registo.' }, { status: 500 })
  }

  // Espelha o registo na tabela do /portugal para entrar no sorteio.
  // Duplicados (23505) ou erros reais nao fazem o registo goalfest falhar.
  const { error: mirrorError } = await supabase
    .from('portugal_registrations')
    .insert({ name, email, phone: normalizedPhone, consent_at: consentAt })

  if (mirrorError && mirrorError.code !== '23505') {
    console.error('[goalfest] falha ao espelhar em portugal_registrations:', mirrorError)
  }

  return NextResponse.json({ ok: true })
}
