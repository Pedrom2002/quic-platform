import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, waitFor } from '@testing-library/react-native'
import MyTicketsScreen from '../../../app/tickets/index'
import type { MyTicket } from '../../../lib/tickets'

const mockFetchMyTickets = jest.fn<(...args: unknown[]) => Promise<MyTicket[]>>()

jest.mock('../../../lib/tickets', () => ({
  fetchMyTickets: (...args: unknown[]) => mockFetchMyTickets(...args),
}))
jest.mock('../../../lib/supabase', () => ({ supabase: {} }))
jest.mock('react-native-qrcode-svg', () => 'QRCode')
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

beforeEach(() => {
  mockFetchMyTickets.mockReset()
})

describe('MyTicketsScreen', () => {
  it('shows empty state when there are no tickets', async () => {
    mockFetchMyTickets.mockResolvedValue([])
    const { getByText } = render(<MyTicketsScreen />)

    await waitFor(() => {
      expect(getByText('Ainda não tens bilhetes.')).toBeTruthy()
    })
  })

  it('renders a ticket with its qr code', async () => {
    mockFetchMyTickets.mockResolvedValue([
      { id: 't1', qr_code: 'qr-abc-123', status: 'valid', event_id: 'event-1', event_name: null, event_start_datetime: null },
    ])
    const { getByText, queryByText } = render(<MyTicketsScreen />)

    await waitFor(() => {
      expect(queryByText('Ainda não tens bilhetes.')).toBeNull()
    })
    expect(getByText('Válido')).toBeTruthy()
  })

  it('renders the event name and date when available', async () => {
    mockFetchMyTickets.mockResolvedValue([
      {
        id: 't1',
        qr_code: 'qr-abc-123',
        status: 'valid',
        event_id: 'event-1',
        event_name: 'Show X',
        event_start_datetime: '2026-08-01T20:00:00.000Z',
      },
    ])
    const { getByText } = render(<MyTicketsScreen />)

    await waitFor(() => {
      expect(getByText('Show X')).toBeTruthy()
    })
  })
})
