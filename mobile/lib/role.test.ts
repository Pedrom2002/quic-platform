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
})
