jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockSearchParams(),
}))
jest.mock('../../../lib/tickets', () => ({
  fetchTicketsBySession: (...args: unknown[]) => mockFetchTicketsBySession(...args),
}))
jest.mock('../../../lib/supabase', () => ({ supabase: {} }))

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, waitFor, fireEvent } from '@testing-library/react-native'
import TicketPurchaseSuccessScreen from '../../../app/tickets/success'
import type { SessionTicketsResult } from '../../../lib/tickets'

const mockFetchTicketsBySession = jest.fn<(...args: unknown[]) => Promise<SessionTicketsResult>>()
const mockReplace = jest.fn()
const mockSearchParams = jest.fn()

beforeEach(() => {
  mockFetchTicketsBySession.mockReset()
  mockReplace.mockReset()
  mockSearchParams.mockReset()
  mockSearchParams.mockReturnValue({ session_id: 'cs_test_123' })
})

describe('TicketPurchaseSuccessScreen', () => {
  it('shows a loading state before the ticket is confirmed', () => {
    mockFetchTicketsBySession.mockReturnValue(new Promise(() => {}))
    const { getByText } = render(<TicketPurchaseSuccessScreen />)

    expect(getByText('A confirmar o teu pagamento...')).toBeTruthy()
  })

  it('shows confirmation once a ticket for this session appears', async () => {
    mockFetchTicketsBySession.mockResolvedValue({
      tickets: [{ id: 't1', qr_code: 'qr-abc', status: 'valid', event_id: 'event-1' }],
      error: false,
    })
    const { getByText } = render(<TicketPurchaseSuccessScreen />)

    await waitFor(() => {
      expect(getByText('Pagamento confirmado')).toBeTruthy()
    })
    expect(mockFetchTicketsBySession).toHaveBeenCalledWith(expect.anything(), 'cs_test_123')
  })

  it('navigates to my tickets when the confirmation button is pressed', async () => {
    mockFetchTicketsBySession.mockResolvedValue({
      tickets: [{ id: 't1', qr_code: 'qr-abc', status: 'valid', event_id: 'event-1' }],
      error: false,
    })
    const { getByText } = render(<TicketPurchaseSuccessScreen />)

    await waitFor(() => {
      expect(getByText('Ver os meus bilhetes')).toBeTruthy()
    })
    fireEvent.press(getByText('Ver os meus bilhetes'))
    expect(mockReplace).toHaveBeenCalledWith('/tickets')
  })

  it('shows a pending state when polling exhausts with no ticket and no error', async () => {
    mockFetchTicketsBySession.mockResolvedValue({ tickets: [], error: false })
    const { getByText } = render(<TicketPurchaseSuccessScreen />)

    await waitFor(
      () => {
        expect(getByText('Ainda a processar')).toBeTruthy()
      },
      { timeout: 10000 }
    )
  }, 15000)

  it('shows an error state when the query fails', async () => {
    mockFetchTicketsBySession.mockResolvedValue({ tickets: [], error: true })
    const { getByText } = render(<TicketPurchaseSuccessScreen />)

    await waitFor(() => {
      expect(getByText('Não foi possível confirmar')).toBeTruthy()
    })
  })

  it('shows an error state immediately when session_id is missing', () => {
    mockSearchParams.mockReturnValue({})
    const { getByText } = render(<TicketPurchaseSuccessScreen />)

    expect(getByText('Não foi possível confirmar')).toBeTruthy()
    expect(mockFetchTicketsBySession).not.toHaveBeenCalled()
  })
})
