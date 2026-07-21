import type { SupabaseClient, Session } from '@supabase/supabase-js'

export type UserRole =
  | { role: 'guest' }
  | { role: 'client' }
  | { role: 'artist'; artist: { id: string; name: string; photo_url: string | null; bio: string | null } }
  | { role: 'staff'; member: { id: string; full_name: string; role: string } }

export async function resolveUserRole(
  supabase: SupabaseClient,
  session: Session | null
): Promise<UserRole> {
  if (!session) return { role: 'guest' }

  const { data } = await supabase
    .from('artists')
    .select('id, name, photo_url, bio')
    .eq('auth_user_id', session.user.id)
    .single()

  if (data) return { role: 'artist', artist: data }

  const { data: staffData } = await supabase
    .from('team_members')
    .select('id, full_name, role')
    .eq('auth_user_id', session.user.id)
    .eq('is_active', true)
    .single()

  if (staffData) {
    return { role: 'staff', member: staffData }
  }

  return { role: 'client' }
}
