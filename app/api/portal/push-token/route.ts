import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const bodySchema = z.object({
  token: z.string().min(1),
})

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null

  if (!bearerToken) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: userData } = await supabase.auth.getUser(bearerToken)
  if (!userData.user?.email) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return Response.json({ error: 'Pedido inválido' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: 'Pedido inválido' }, { status: 400 })
  }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('email', userData.user.email)
    .maybeSingle()

  if (clientError || !client) {
    return Response.json({ error: 'Cliente não encontrado' }, { status: 404 })
  }

  const { error: upsertError } = await supabase
    .from('client_push_tokens')
    .upsert({ client_id: client.id, token: parsed.data.token }, { onConflict: 'client_id,token' })

  if (upsertError) {
    return Response.json({ error: 'Erro ao registar token' }, { status: 500 })
  }

  return Response.json({ success: true })
}
