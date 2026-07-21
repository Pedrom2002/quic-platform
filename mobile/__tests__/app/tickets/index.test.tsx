import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, waitFor } from '@testing-library/react-native'
import MyTicketsScreen from '../../../app/tickets/index'

const mockFetchMyTickets = jest.fn()

jest.mock('../../../lib/tickets', () => ({
  fetchMyTickets: (...args: unknown[]) => mockFetchMyTickets(...args),
}))
jest.mock('../../../lib/supabase', () => ({ supabase: {} }))
jest.mock('react-native-qrcode-svg', () => 'QRCode')

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
      { id: 't1', qr_code: 'qr-abc-123', status: 'valid', event_id: 'event-1' },
    ])
    const { getByText, queryByText } = render(<MyTicketsScreen />)

    await waitFor(() => {
      expect(queryByText('Ainda não tens bilhetes.')).toBeNull()
    })
    expect(getByText('Válido')).toBeTruthy()
  })
})
