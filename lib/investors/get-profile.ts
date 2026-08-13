import { createClient } from '@/lib/supabase/server'

export type InvestorProfile = {
  userId: string
  fullName: string
  status: 'pending' | 'approved' | 'rejected'
}

export type InvestorSession =
  | { authenticated: false }
  | { authenticated: true; profile: InvestorProfile | null }

export async function getInvestorProfile(): Promise<InvestorSession> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { authenticated: false }

  const { data: investor } = await supabase
    .from('investors')
    .select('full_name, status')
    .eq('auth_user_id', user.id)
    .single()

  if (!investor) return { authenticated: true, profile: null }

  return {
    authenticated: true,
    profile: {
      userId: user.id,
      fullName: investor.full_name,
      status: investor.status as InvestorProfile['status'],
    },
  }
}
