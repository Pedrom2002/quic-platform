import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

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

  const { error } = await supabase
    .from('goalfest_registrations')
    .insert({ name, email, phone: normalizedPhone, consent_at: new Date().toISOString() })

  if (error) {
    return NextResponse.json({ error: 'Erro ao guardar registo.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
