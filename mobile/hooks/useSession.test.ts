import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { renderHook, waitFor } from '@testing-library/react-native'
import { useSession } from './useSession'

const mockGetSession = jest.fn()
const mockOnAuthStateChange = jest.fn()

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  },
}))

beforeEach(() => {
  mockGetSession.mockReset()
  mockOnAuthStateChange.mockReset()
  mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } })
})

describe('useSession', () => {
  it('starts loading then resolves session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    const { result } = renderHook(() => useSession())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.session).toEqual({ user: { id: 'u1' } })
  })

  it('resolves null session when logged out', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    const { result } = renderHook(() => useSession())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.session).toBeNull()
  })
})
