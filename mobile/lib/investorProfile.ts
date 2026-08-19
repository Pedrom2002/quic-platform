// mobile/lib/investorProfile.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export interface InvestorProfile {
  fullName: string
  phone: string | null
}

interface InvestorProfileRow {
  full_name: string
  phone: string | null
}

// Replica a query de app/investors/(gated)/profile/page.tsx no runtime
// mobile (React Native não tem Server Components/Server Actions).
export async function fetchInvestorProfile(supabase: SupabaseClient, investorId: string): Promise<InvestorProfile> {
  const { data } = await supabase
    .from('investors')
    .select('full_name, phone')
    .eq('id', investorId)
    .single()

  const row = data as InvestorProfileRow | null

  return {
    fullName: row?.full_name ?? '',
    phone: row?.phone ?? null,
  }
}

// Replica app/investors/(gated)/profile/actions.ts:updateProfile no runtime
// mobile, sem Server Actions. Filtra por id (em vez de auth_user_id) porque
// investorId ja foi resolvido a partir da propria sessao autenticada
// (resolveUserRole faz .eq('auth_user_id', session.user.id) antes de expor
// investor.id) — a RLS investor_updates_own_profile (auth_user_id =
// auth.uid()) protege a linha alvo independentemente do filtro do cliente.
export async function updateInvestorProfile(
  supabase: SupabaseClient,
  investorId: string,
  updates: { fullName: string; phone: string | null }
): Promise<{ error?: string }> {
  if (updates.fullName.trim().length === 0) {
    return { error: 'Nome é obrigatório.' }
  }

  const { data, error } = await supabase
    .from('investors')
    .update({ full_name: updates.fullName, phone: updates.phone })
    .eq('id', investorId)
    .select('id')

  if (error || !data || (data as unknown[]).length === 0) {
    return { error: 'Não foi possível guardar as alterações. Tenta novamente.' }
  }

  return {}
}
