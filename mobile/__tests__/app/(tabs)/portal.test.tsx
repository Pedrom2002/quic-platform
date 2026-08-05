import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, waitFor, fireEvent } from '@testing-library/react-native'
import PortalScreen from '../../../app/(tabs)/portal'
import type { UserRole } from '../../../lib/role'
import type { ArtistPortalData } from '../../../lib/artistPortal'
import type { PortalData } from '../../../lib/portal'

const mockUseSession = jest.fn()
const mockResolveUserRole = jest.fn<(...args: unknown[]) => Promise<UserRole>>()
const mockFetchArtistPortalData = jest.fn<(...args: unknown[]) => Promise<ArtistPortalData>>()
const mockFetchPortalData = jest.fn<(...args: unknown[]) => Promise<PortalData | null>>()

jest.mock('../../../hooks/useSession', () => ({ useSession: () => mockUseSession() }))
jest.mock('../../../lib/role', () => ({ resolveUserRole: (...args: unknown[]) => mockResolveUserRole(...args) }))
jest.mock('../../../lib/artistPortal', () => ({
  fetchArtistPortalData: (...args: unknown[]) => mockFetchArtistPortalData(...args),
}))
jest.mock('../../../lib/portal', () => ({
  fetchPortalData: (...args: unknown[]) => mockFetchPortalData(...args),
}))
jest.mock('../../../lib/supabase', () => ({ supabase: {} }))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

beforeEach(() => {
  mockUseSession.mockReset()
  mockResolveUserRole.mockReset()
  mockFetchArtistPortalData.mockReset()
  mockFetchPortalData.mockReset()
})

describe('PortalScreen', () => {
  it('shows restricted message for staff role', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'staff', member: { id: 's1', full_name: 'Staffer', role: 'admin' } })

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

  it('shows past agenda items via toggle when there are no upcoming ones', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({
      role: 'artist',
      artist: { id: 'a1', name: 'Maria Silva', photo_url: null, bio: null },
    })
    mockFetchArtistPortalData.mockResolvedValue({
      upcoming: [],
      past: [{ id: 'ag2', type: 'show', title: 'Concerto Antigo', starts_at: '2026-01-01T20:00:00Z', ends_at: null, location: null, notes: null }],
      clippings: [],
      contents: [],
      documents: [],
    })

    const { getByText, queryByText } = render(<PortalScreen />)

    await waitFor(() => {
      expect(getByText('Sem compromissos futuros.')).toBeTruthy()
    })
    expect(queryByText('Concerto Antigo')).toBeNull()

    fireEvent.press(getByText('Passados +'))
    expect(getByText('Concerto Antigo')).toBeTruthy()
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

  it('shows the event name, progress and checklist items for a client with a portal token', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client', portalToken: 'token-abc' })
    mockFetchPortalData.mockResolvedValue({
      event: { id: 'event-1', name: 'Casamento Silva', venue_name: 'Quinta X', start_datetime: '2026-09-01T18:00:00.000Z', status: 'active' },
      items: [
        { id: 'item-1', client_label: null, title: 'Contrato assinado', status: 'completed', completed_at: '2026-08-01T10:00:00.000Z', completion_note: null, position: 0, due_at: null, category: 'Geral', files: [] },
        { id: 'item-2', client_label: null, title: 'Menu confirmado', status: 'pending', completed_at: null, completion_note: null, position: 1, due_at: null, category: 'Geral', files: [] },
      ],
      progress: { total: 2, completed: 1, percent: 50 },
      articles: [],
      reports: [],
      eventFiles: [],
    })

    const { getByText } = render(<PortalScreen />)

    await waitFor(() => {
      expect(getByText('Casamento Silva')).toBeTruthy()
      expect(getByText('Contrato assinado')).toBeTruthy()
      expect(getByText('Menu confirmado')).toBeTruthy()
      expect(getByText('1 de 2 concluídas')).toBeTruthy()
    }, { timeout: 10000 })
  })

  it('shows an internal tab bar with Imprensa when the client has articles', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client', portalToken: 'token-abc' })
    mockFetchPortalData.mockResolvedValue({
      event: { id: 'event-1', name: 'Casamento Silva', venue_name: 'Quinta X', start_datetime: '2026-09-01T18:00:00.000Z', status: 'active' },
      items: [],
      progress: { total: 0, completed: 0, percent: 0 },
      articles: [
        { id: 'art-1', title: 'Casamento é destaque na imprensa', url: 'https://noticia.pt/1', source: 'Jornal X', created_at: '2026-08-02T10:00:00.000Z' },
      ],
      reports: [],
      eventFiles: [],
    })

    const { getByText, queryByText } = render(<PortalScreen />)

    await waitFor(() => {
      expect(getByText('Casamento Silva')).toBeTruthy()
    })
    expect(queryByText('Imprensa')).toBeTruthy()

    fireEvent.press(getByText('Imprensa'))
    expect(getByText('Casamento é destaque na imprensa')).toBeTruthy()
    expect(getByText('Jornal X')).toBeTruthy()
  })

  it('shows a Documentos tab combining reports and event files', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client', portalToken: 'token-abc' })
    mockFetchPortalData.mockResolvedValue({
      event: { id: 'event-1', name: 'Casamento Silva', venue_name: 'Quinta X', start_datetime: '2026-09-01T18:00:00.000Z', status: 'active' },
      items: [],
      progress: { total: 0, completed: 0, percent: 0 },
      articles: [],
      reports: [
        { id: 'rep-1', title: 'Relatório técnico', type: 'technical', file_name: 'relatorio.pdf', file_size: 2048, mime_type: 'application/pdf', blob_url: 'https://x/relatorio.pdf', created_at: '2026-08-03T10:00:00.000Z' },
      ],
      eventFiles: [
        { id: 'ef-1', file_name: 'planta.pdf', file_size: 1024, mime_type: 'application/pdf', blob_url: 'https://x/planta.pdf' },
      ],
    })

    const { getByText } = render(<PortalScreen />)

    await waitFor(() => {
      expect(getByText('Casamento Silva')).toBeTruthy()
    })
    expect(getByText('Documentos')).toBeTruthy()

    fireEvent.press(getByText('Documentos'))
    expect(getByText('Relatório técnico')).toBeTruthy()
    expect(getByText('planta.pdf')).toBeTruthy()
  })

  it('does not show a tab bar when the client has no articles, reports or files', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client', portalToken: 'token-abc' })
    mockFetchPortalData.mockResolvedValue({
      event: { id: 'event-1', name: 'Casamento Silva', venue_name: 'Quinta X', start_datetime: '2026-09-01T18:00:00.000Z', status: 'active' },
      items: [],
      progress: { total: 0, completed: 0, percent: 0 },
      articles: [],
      reports: [],
      eventFiles: [],
    })

    const { getByText, queryByText } = render(<PortalScreen />)

    await waitFor(() => {
      expect(getByText('Casamento Silva')).toBeTruthy()
    })
    expect(queryByText('Imprensa')).toBeNull()
    expect(queryByText('Documentos')).toBeNull()
  })

  it('shows an empty message when a client has no portal token', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client', portalToken: null })

    const { getByText } = render(<PortalScreen />)

    await waitFor(() => {
      expect(getByText('Sem evento associado à tua conta.')).toBeTruthy()
    })
    expect(mockFetchPortalData).not.toHaveBeenCalled()
  })

  it('shows an error message instead of an infinite spinner when a client fetch fails', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client', portalToken: 'token-abc' })
    mockFetchPortalData.mockResolvedValue(null)

    const { getByText } = render(<PortalScreen />)

    await waitFor(() => {
      expect(getByText('Não foi possível carregar o teu evento. Tenta novamente mais tarde.')).toBeTruthy()
    })
  })
})
