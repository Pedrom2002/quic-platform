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

    const session = { user: { id: 'auth-user-1' } } as never
    const result = await resolveUserRole(supabase, session)

    expect(supabase.from).toHaveBeenCalledWith('artists')
    expect(select).toHaveBeenCalledWith('id, name, photo_url, bio')
    expect(eq).toHaveBeenCalledWith('auth_user_id', 'auth-user-1')
    expect(result).toEqual({
      role: 'artist',
      artist: { id: 'artist-1', name: 'Maria', photo_url: null, bio: null },
    })
  })

  it('returns client role when no artists row found', async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: null })
    const eq = jest.fn(() => ({ single }))
    const select = jest.fn(() => ({ eq }))
    const supabase = { from: jest.fn(() => ({ select })) } as never

    const session = { user: { id: 'auth-user-2' } } as never
    const result = await resolveUserRole(supabase, session)

    expect(result).toEqual({ role: 'client' })
  })

  it('returns staff role when team_members row found (and no artist row)', async () => {
    const artistSingle = jest.fn().mockResolvedValue({ data: null, error: null })
    const artistEq = jest.fn(() => ({ single: artistSingle }))
    const artistSelect = jest.fn(() => ({ eq: artistEq }))

    const staffSingle = jest.fn().mockResolvedValue({
      data: { id: 'member-1', full_name: 'João Staff', role: 'manager' },
      error: null,
    })
    const staffEq = jest.fn(() => ({ single: staffSingle }))
    const staffSelect = jest.fn(() => ({ eq: staffEq }))

    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'artists') return { select: artistSelect }
        if (table === 'team_members') return { select: staffSelect }
        throw new Error(`unexpected table ${table}`)
      }),
    } as never

    const session = { user: { id: 'auth-user-3' } } as never
    const result = await resolveUserRole(supabase, session)

    expect(staffSelect).toHaveBeenCalledWith('id, full_name, role')
    expect(staffEq).toHaveBeenCalledWith('auth_user_id', 'auth-user-3')
    expect(result).toEqual({
      role: 'staff',
      member: { id: 'member-1', full_name: 'João Staff', role: 'manager' },
    })
  })
})
