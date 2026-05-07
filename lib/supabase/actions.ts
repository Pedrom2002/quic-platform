'use server'

import type { createClient } from '@/lib/supabase/server'

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

export async function assertEventOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  organizationId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('organization_id', organizationId)
    .single()
  return !!data
}
