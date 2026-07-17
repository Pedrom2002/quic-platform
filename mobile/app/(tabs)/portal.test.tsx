import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, waitFor } from '@testing-library/react-native'
import PortalScreen from './portal'

const mockUseSession = jest.fn()
const mockResolveUserRole = jest.fn()

jest.mock('../../hooks/useSession', () => ({ useSession: () => mockUseSession() }))
jest.mock('../../lib/role', () => ({ resolveUserRole: (...args: unknown[]) => mockResolveUserRole(...args) }))
jest.mock('../../lib/supabase', () => ({ supabase: {} }))

beforeEach(() => {
  mockUseSession.mockReset()
  mockResolveUserRole.mockReset()
})

describe('PortalScreen', () => {
  it('shows restricted message for client role', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client' })

    const { getByText } = render(<PortalScreen />)

    await waitFor(() => {
      expect(getByText('Portal reservado a artistas agenciados')).toBeTruthy()
    })
  })

  it('shows artist name for artist role', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({
      role: 'artist',
      artist: { id: 'a1', name: 'Maria Silva', photo_url: null, bio: null },
    })

    const { getByText } = render(<PortalScreen />)

    await waitFor(() => {
      expect(getByText('Maria Silva')).toBeTruthy()
    })
  })
})
