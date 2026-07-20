import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, waitFor } from '@testing-library/react-native'
import PortalScreen from '../../../app/(tabs)/portal'

const mockUseSession = jest.fn()
const mockResolveUserRole = jest.fn()
const mockFetchArtistPortalData = jest.fn()

jest.mock('../../../hooks/useSession', () => ({ useSession: () => mockUseSession() }))
jest.mock('../../../lib/role', () => ({ resolveUserRole: (...args: unknown[]) => mockResolveUserRole(...args) }))
jest.mock('../../../lib/artistPortal', () => ({
  fetchArtistPortalData: (...args: unknown[]) => mockFetchArtistPortalData(...args),
}))
jest.mock('../../../lib/supabase', () => ({ supabase: {} }))

beforeEach(() => {
  mockUseSession.mockReset()
  mockResolveUserRole.mockReset()
  mockFetchArtistPortalData.mockReset()
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

  it('shows artist name and agenda data for artist role', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({
      role: 'artist',
      artist: { id: 'a1', name: 'Maria Silva', photo_url: null, bio: null },
    })
    mockFetchArtistPortalData.mockResolvedValue({
      upcoming: [{ id: 'ag1', type: 'show', title: 'Concerto X', starts_at: '2026-08-01T20:00:00Z', ends_at: null, location: null, notes: null }],
      past: [],
      clippings: [],
      contents: [],
      documents: [],
    })

    const { getByText } = render(<PortalScreen />)

    await waitFor(() => {
      expect(getByText('Maria Silva')).toBeTruthy()
    })
    expect(getByText('Concerto X')).toBeTruthy()
  })

  it('hides tabs for sections with no data', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({
      role: 'artist',
      artist: { id: 'a1', name: 'Maria Silva', photo_url: null, bio: null },
    })
    mockFetchArtistPortalData.mockResolvedValue({
      upcoming: [],
      past: [],
      clippings: [],
      contents: [],
      documents: [],
    })

    const { queryByText } = render(<PortalScreen />)

    await waitFor(() => {
      expect(queryByText('Imprensa')).toBeNull()
      expect(queryByText('Conteúdos')).toBeNull()
      expect(queryByText('Documentos')).toBeNull()
    })
  })
})
