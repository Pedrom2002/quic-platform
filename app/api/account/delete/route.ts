// app/api/account/delete/route.ts
//
// Eliminacao de conta pelo proprio utilizador (App Store guideline 5.1.1(v),
// Play Data Safety). So aceita Bearer token da mobile, seguindo o mesmo
// padrao de app/api/tickets/checkout/route.ts. A limpeza real corre na RPC
// delete_own_account (supabase/migrations/0067_account_deletion.sql), que
// so o service_role pode invocar.
import { createAdminClient } from '@/lib/supabase/admin'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'

const DELETE_LIMIT = 5
const DELETE_WINDOW_MS = 60 * 60 * 1_000

export async function POST(request: Request) {
  const ip = getClientIp(request)
  if (await isRateLimited(`account-delete:${ip}`, DELETE_LIMIT, DELETE_WINDOW_MS)) {
    return Response.json({ error: 'Demasiadas tentativas. Tenta novamente mais tarde.' }, { status: 429 })
  }

  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
  if (!bearerToken) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: userData } = await admin.auth.getUser(bearerToken)
  if (!userData.user) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: rpcData, error } = await admin.rpc('delete_own_account', {
    p_auth_user_id: userData.user.id,
  })
  const result = rpcData as { success: boolean; error?: string } | null

  if (error || !result?.success) {
    console.error('[account/delete]', error?.message ?? result?.error)
    return Response.json({ error: 'Não foi possível eliminar a conta. Tenta novamente.' }, { status: 500 })
  }

  return Response.json({ success: true })
}
