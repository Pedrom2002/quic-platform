import { describe, it, expect, jest } from '@jest/globals'
import { resolveUserRole } from './role'

describe('resolveUserRole', () => {
  it('returns client role when no session', async () => {
    const supabase = { from: jest.fn() } as never
    const result = await resolveUserRole(supabase, null)
    expect(result).toEqual({ role: 'guest' })
  })

  it('returns artist role when artists row found', async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: 'artist-1', name: 'Maria', photo_url: null, bio: null },
      error: null,
    })
    const eq = jest.fn(() => ({ single }))
    const select = jest.fn(() => ({ eq }))
    const supabase = { from: jest.fn(() => ({ select })) } as never

    const session = { user: { id: 'auth-user-1', email: 'maria@example.com' } } as never
    const result = await resolveUserRole(supabase, session)

    expect(supabase.from).toHaveBeenCalledWith('artists')
    expect(select).toHaveBeenCalledWith('id, name, photo_url, bio')
    expect(eq).toHaveBeenCalledWith('auth_user_id', 'auth-user-1')
    expect(result).toEqual({
      role: 'artist',
      artist: { id: 'artist-1', name: 'Maria', photo_url: null, bio: null },
    })
  })

  it('returns staff role when team_members row found (and no artist row)', async () => {
    const artistSingle = jest.fn().mockResolvedValue({ data: null, error: null })
    const artistEq = jest.fn(() => ({ single: artistSingle }))
    const artistSelect = jest.fn(() => ({ eq: artistEq }))

    const staffSingle = jest.fn().mockResolvedValue({
      data: { id: 'member-1', full_name: 'João Staff', role: 'manager' },
      error: null,
    })
    const staffEqActive = jest.fn(() => ({ single: staffSingle }))
    const staffEq = jest.fn(() => ({ eq: staffEqActive }))
    const staffSelect = jest.fn(() => ({ eq: staffEq }))

    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'artists') return { select: artistSelect }
        if (table === 'team_members') return { select: staffSelect }
        throw new Error(`unexpected table ${table}`)
      }),
    } as never

    const session = { user: { id: 'auth-user-3', email: 'joao@example.com' } } as never
    const result = await resolveUserRole(supabase, session)

    expect(staffSelect).toHaveBeenCalledWith('id, full_name, role')
    expect(staffEq).toHaveBeenCalledWith('auth_user_id', 'auth-user-3')
    expect(staffEqActive).toHaveBeenCalledWith('is_active', true)
    expect(result).toEqual({
      role: 'staff',
      member: { id: 'member-1', full_name: 'João Staff', role: 'manager' },
    })
  })

  it('returns client role without token when session has no email', async () => {
    const artistSingle = jest.fn().mockResolvedValue({ data: null, error: null })
    const artistEq = jest.fn(() => ({ single: artistSingle }))
    const artistSelect = jest.fn(() => ({ eq: artistEq }))

    const staffSingle = jest.fn().mockResolvedValue({ data: null, error: null })
    const staffEqActive = jest.fn(() => ({ single: staffSingle }))
    const staffEq = jest.fn(() => ({ eq: staffEqActive }))
    const staffSelect = jest.fn(() => ({ eq: staffEq }))

    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'artists') return { select: artistSelect }
        if (table === 'team_members') return { select: staffSelect }
        throw new Error(`unexpected table ${table}`)
      }),
    } as never

    const session = { user: { id: 'auth-user-4', email: null } } as never
    const result = await resolveUserRole(supabase, session)

    expect(result).toEqual({ role: 'client', portalToken: null })
  })

  it('returns client role without token when no clients row matches email', async () => {
    const artistSingle = jest.fn().mockResolvedValue({ data: null, error: null })
    const artistEq = jest.fn(() => ({ single: artistSingle }))
    const artistSelect = jest.fn(() => ({ eq: artistEq }))

    const staffSingle = jest.fn().mockResolvedValue({ data: null, error: null })
    const staffEqActive = jest.fn(() => ({ single: staffSingle }))
    const staffEq = jest.fn(() => ({ eq: staffEqActive }))
    const staffSelect = jest.fn(() => ({ eq: staffEq }))

    const clientMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null })
    const clientEq = jest.fn(() => ({ maybeSingle: clientMaybeSingle }))
    const clientSelect = jest.fn(() => ({ eq: clientEq }))

    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'artists') return { select: artistSelect }
        if (table === 'team_members') return { select: staffSelect }
        if (table === 'clients') return { select: clientSelect }
        throw new Error(`unexpected table ${table}`)
      }),
    } as never

    const session = { user: { id: 'auth-user-5', email: 'semevento@example.com' } } as never
    const result = await resolveUserRole(supabase, session)

    expect(clientSelect).toHaveBeenCalledWith('id')
    expect(clientEq).toHaveBeenCalledWith('email', 'semevento@example.com')
    expect(result).toEqual({ role: 'client', portalToken: null })
  })

  it('returns client role with the nearest event portal token', async () => {
    const artistSingle = jest.fn().mockResolvedValue({ data: null, error: null })
    const artistEq = jest.fn(() => ({ single: artistSingle }))
    const artistSelect = jest.fn(() => ({ eq: artistEq }))

    const staffSingle = jest.fn().mockResolvedValue({ data: null, error: null })
    const staffEqActive = jest.fn(() => ({ single: staffSingle }))
    const staffEq = jest.fn(() => ({ eq: staffEqActive }))
    const staffSelect = jest.fn(() => ({ eq: staffEq }))

    const clientMaybeSingle = jest.fn().mockResolvedValue({ data: { id: 'client-1' }, error: null })
    const clientEq = jest.fn(() => ({ maybeSingle: clientMaybeSingle }))
    const clientSelect = jest.fn(() => ({ eq: clientEq }))

    const eventClientsOrder = jest.fn().mockResolvedValue({
      data: [
        { events: { portal_token: 'token-newest', portal_token_expires_at: null, start_datetime: '2026-09-01T00:00:00.000Z' } },
        { events: { portal_token: 'token-older', portal_token_expires_at: null, start_datetime: '2026-01-01T00:00:00.000Z' } },
      ],
      error: null,
    })
    const eventClientsNotNull = jest.fn(() => ({ order: eventClientsOrder }))
    const eventClientsEq = jest.fn(() => ({ not: eventClientsNotNull }))
    const eventClientsSelect = jest.fn(() => ({ eq: eventClientsEq }))

    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'artists') return { select: artistSelect }
        if (table === 'team_members') return { select: staffSelect }
        if (table === 'clients') return { select: clientSelect }
        if (table === 'event_clients') return { select: eventClientsSelect }
        throw new Error(`unexpected table ${table}`)
      }),
    } as never

    const session = { user: { id: 'auth-user-6', email: 'cliente@example.com' } } as never
    const result = await resolveUserRole(supabase, session)

    expect(eventClientsSelect).toHaveBeenCalledWith('events!inner(portal_token, portal_token_expires_at, start_datetime)')
    expect(eventClientsEq).toHaveBeenCalledWith('client_id', 'client-1')
    expect(eventClientsNotNull).toHaveBeenCalledWith('events.portal_token', 'is', null)
    expect(eventClientsOrder).toHaveBeenCalledWith('events(start_datetime)', { ascending: false })
    expect(result).toEqual({ role: 'client', portalToken: 'token-newest' })
  })
})
