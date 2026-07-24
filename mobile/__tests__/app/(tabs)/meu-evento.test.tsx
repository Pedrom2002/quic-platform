jest.mock('../../../lib/portal', () => ({
  fetchPortalData: (...args: unknown[]) => mockFetchPortalData(...args),
}))
jest.mock('../../../lib/role', () => ({
  resolveUserRole: (...args: unknown[]) => mockResolveUserRole(...args),
}))
jest.mock('../../../lib/supabase', () => ({ supabase: {} }))
jest.mock('../../../hooks/useSession', () => ({
  useSession: () => ({ session: { user: { id: 'u1', email: 'cliente@example.com' } }, loading: false }),
}))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, waitFor } from '@testing-library/react-native'
import MeuEventoScreen from '../../../app/(tabs)/meu-evento'

const mockFetchPortalData = jest.fn()
const mockResolveUserRole = jest.fn()

beforeEach(() => {
  mockFetchPortalData.mockReset()
  mockResolveUserRole.mockReset()
})

describe('MeuEventoScreen', () => {
  it('shows the event name, progress and checklist items once loaded', async () => {
    mockResolveUserRole.mockResolvedValue({ role: 'client', portalToken: 'token-abc' })
    mockFetchPortalData.mockResolvedValue({
      event: { id: 'event-1', name: 'Casamento Silva', venue_name: 'Quinta X', start_datetime: '2026-09-01T18:00:00.000Z', status: 'active' },
      items: [
        { id: 'item-1', client_label: null, title: 'Contrato assinado', status: 'completed', completed_at: '2026-08-01T10:00:00.000Z', completion_note: null, position: 0, due_at: null, category: 'Geral', files: [] },
        { id: 'item-2', client_label: null, title: 'Menu confirmado', status: 'pending', completed_at: null, completion_note: null, position: 1, due_at: null, category: 'Geral', files: [] },
      ],
      progress: { total: 2, completed: 1, percent: 50 },
    })

    const { getByText } = render(<MeuEventoScreen />)

    await waitFor(() => {
      expect(getByText('Casamento Silva')).toBeTruthy()
      expect(getByText('Contrato assinado')).toBeTruthy()
      expect(getByText('Menu confirmado')).toBeTruthy()
      expect(getByText('1 de 2 concluídas')).toBeTruthy()
    })
  })

  it('shows an empty message when there is no portal token', async () => {
    mockResolveUserRole.mockResolvedValue({ role: 'client', portalToken: null })

    const { getByText } = render(<MeuEventoScreen />)

    await waitFor(() => {
      expect(getByText('Sem evento associado à tua conta.')).toBeTruthy()
    })
    expect(mockFetchPortalData).not.toHaveBeenCalled()
  })
})
