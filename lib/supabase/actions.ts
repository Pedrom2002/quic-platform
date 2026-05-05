import { createClient } from '@/lib/supabase/server'

export async function resolveOrgMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ organization_id: string } | null> {
  const { data } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('auth_user_id', userId)
    .single()
  return data
}
