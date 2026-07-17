import type { SupabaseClient, Session } from '@supabase/supabase-js'

export type UserRole =
  | { role: 'guest' }
  | { role: 'client' }
  | { role: 'artist'; artist: { id: string; name: string; photo_url: string | null; bio: string | null } }

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

  if (!data) return { role: 'client' }

  return { role: 'artist', artist: data }
}
