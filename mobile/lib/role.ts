import type { SupabaseClient, Session } from '@supabase/supabase-js'

export type UserRole =
  | { role: 'guest' }
  | { role: 'client'; portalToken: string | null }
  | { role: 'artist'; artist: { id: string; name: string; photo_url: string | null; bio: string | null } }
  | { role: 'staff'; member: { id: string; full_name: string; role: string } }

interface EventPortalRow {
  events: {
    portal_token: string | null
    portal_token_expires_at: string | null
    start_datetime: string
  }
}

function isPortalTokenUsable(row: EventPortalRow): boolean {
  const { portal_token, portal_token_expires_at } = row.events
  if (!portal_token) return false
  if (portal_token_expires_at && new Date(portal_token_expires_at) <= new Date()) return false
  return true
}

async function resolveClientPortalToken(
  supabase: SupabaseClient,
  email: string
): Promise<string | null> {
  const { data: clientData } = await supabase
    .from('clients')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (!clientData) return null

  const { data: eventClientsData } = await supabase
    .from('event_clients')
    .select('events!inner(portal_token, portal_token_expires_at, start_datetime)')
    .eq('client_id', clientData.id)
    .not('events.portal_token', 'is', null)
    .order('events(start_datetime)', { ascending: false })

  const rows = (eventClientsData ?? []) as unknown as EventPortalRow[]
  const usable = rows.find(isPortalTokenUsable)
  return usable?.events.portal_token ?? null
}

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

  const email = session.user.email
  if (!email) return { role: 'client', portalToken: null }

  const portalToken = await resolveClientPortalToken(supabase, email)
  return { role: 'client', portalToken }
}
