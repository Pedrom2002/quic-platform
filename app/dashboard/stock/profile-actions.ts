'use server'

import { requireOrgAuthFull } from '@/lib/supabase/actions'

// Regista/atualiza o perfil do próprio utilizador da equipa (id + email +
// display_name) em stock_profiles. Chamado no layout depois do gate de auth.
// Nunca deve bloquear o acesso: o chamador envolve em try/catch e ignora
// falhas (o perfil é apenas para resolver o autor no ledger de movimentos).
export async function ensureStockProfile(): Promise<void> {
  const { supabase, user, member } = await requireOrgAuthFull()

  if (member.role !== 'admin' && member.role !== 'manager') {
    return
  }

  const displayName = member.full_name ?? user.email ?? null

  await supabase.from('stock_profiles').upsert(
    {
      id: user.id,
      email: user.email ?? null,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )
}
