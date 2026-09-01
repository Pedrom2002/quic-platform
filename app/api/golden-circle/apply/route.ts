import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'

const APPLY_LIMIT = 5
const APPLY_WINDOW_MS = 10 * 60 * 1_000

// Limites de tamanho evitam que o endpoint publico seja usado para encher
// logs/BD com payloads grandes.
const schema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  company: z.string().trim().max(160).optional().or(z.literal('')),
  message: z.string().trim().max(2000).optional().or(z.literal('')),
})

export async function POST(request: Request) {
  const ip = getClientIp(request)
  if (await isRateLimited(`golden-circle-apply:${ip}`, APPLY_LIMIT, APPLY_WINDOW_MS)) {
    return NextResponse.json(
      { error: 'Demasiadas tentativas. Tenta novamente mais tarde.' },
      { status: 429 }
    )
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos. Verifica o formulário.' }, { status: 400 })
  }

  // TODO: persistir em `golden_circle_applications` (migration por criar) e
  // disparar email de confirmacao. Nao registar PII do candidato em logs.
  return NextResponse.json(
    { ok: true, message: 'Candidatura recebida com sucesso. Enviaremos um email de confirmação.' },
    { status: 201 }
  )
}
