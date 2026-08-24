// mobile/lib/goldenCircleApply.ts
import type { SupabaseClient } from '@supabase/supabase-js'

// Mesma organização fixa usada em lib/investors/constants.ts (web) — a
// plataforma ainda não é multi-tenant para investidores.
const FIXED_ORG_ID = '00000000-0000-0000-0000-000000000001'

export type ApplyResult = { error?: string }

// Insere o pedido de acesso ao Golden Circle para a sessão já autenticada,
// sem criar conta nova (ao contrário de app/investors/(public)/signup, que é
// o fluxo público para quem ainda não tem sessão). A policy RLS
// "anyone_can_register" só permite auth_user_id = auth.uid() e
// status = 'pending', por isso não é preciso repetir essa validação aqui.
export async function applyForGoldenCircle(
  supabase: SupabaseClient,
  authUserId: string,
  input: { fullName: string; email: string; phone: string | null }
): Promise<ApplyResult> {
  if (input.fullName.trim().length === 0) {
    return { error: 'Nome é obrigatório.' }
  }

  const { error } = await supabase.from('investors').insert({
    auth_user_id: authUserId,
    organization_id: FIXED_ORG_ID,
    full_name: input.fullName.trim(),
    email: input.email,
    phone: input.phone,
    status: 'pending',
  })

  if (error) {
    return { error: 'Não foi possível submeter o pedido. Tenta novamente mais tarde.' }
  }

  return {}
}
