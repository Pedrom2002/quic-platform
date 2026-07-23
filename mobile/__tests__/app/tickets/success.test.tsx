jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}))
jest.mock('../../../lib/tickets', () => ({
  fetchMyTickets: (...args: unknown[]) => mockFetchMyTickets(...args),
}))
jest.mock('../../../lib/supabase', () => ({ supabase: {} }))

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, waitFor, fireEvent } from '@testing-library/react-native'
import TicketPurchaseSuccessScreen from '../../../app/tickets/success'

const mockFetchMyTickets = jest.fn()
const mockReplace = jest.fn()

beforeEach(() => {
  mockFetchMyTickets.mockReset()
  mockReplace.mockReset()
})

describe('TicketPurchaseSuccessScreen', () => {
  it('shows a loading state before the ticket is confirmed', () => {
    mockFetchMyTickets.mockReturnValue(new Promise(() => {}))
    const { getByText } = render(<TicketPurchaseSuccessScreen />)

    expect(getByText('A confirmar o teu pagamento...')).toBeTruthy()
  })

  it('shows confirmation once the ticket appears', async () => {
    mockFetchMyTickets.mockResolvedValue([
      { id: 't1', qr_code: 'qr-abc', status: 'valid', event_id: 'event-1' },
    ])
    const { getByText } = render(<TicketPurchaseSuccessScreen />)

    await waitFor(() => {
      expect(getByText('Pagamento confirmado')).toBeTruthy()
    })
  })

  it('navigates to my tickets when the button is pressed', async () => {
    mockFetchMyTickets.mockResolvedValue([
      { id: 't1', qr_code: 'qr-abc', status: 'valid', event_id: 'event-1' },
    ])
    const { getByText } = render(<TicketPurchaseSuccessScreen />)

    await waitFor(() => {
      expect(getByText('Ver os meus bilhetes')).toBeTruthy()
    })
    fireEvent.press(getByText('Ver os meus bilhetes'))
    expect(mockReplace).toHaveBeenCalledWith('/tickets')
  })
})
