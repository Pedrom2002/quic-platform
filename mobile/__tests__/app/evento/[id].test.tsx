import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, waitFor, fireEvent } from '@testing-library/react-native'
import { Linking, Alert } from 'react-native'
import EventDetailScreen from '../../../app/evento/[id]'
import type { PublicEvent } from '../../../lib/events'
import type { TicketType } from '../../../lib/tickets'

const mockFetchEventById = jest.fn<
  (...args: unknown[]) => Promise<Omit<PublicEvent, 'min_ticket_price_cents'> | null>
>()
const mockUseLocalSearchParams = jest.fn()
const mockFetchTicketTypes = jest.fn<(...args: unknown[]) => Promise<TicketType[]>>()
const mockCreateCheckoutSession = jest.fn<(...args: unknown[]) => Promise<string | null>>()
const mockGetSession = jest.fn<
  (...args: unknown[]) => Promise<{ data: { session: { access_token: string } | null } }>
>()

jest.mock('../../../lib/events', () => ({
  fetchEventById: (...args: unknown[]) => mockFetchEventById(...args),
}))
jest.mock('../../../lib/tickets', () => ({
  fetchTicketTypes: (...args: unknown[]) => mockFetchTicketTypes(...args),
  createCheckoutSession: (...args: unknown[]) => mockCreateCheckoutSession(...args),
}))
jest.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getSession: (...args: unknown[]) => mockGetSession(...args) } },
}))
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}))

const mockOpenURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never)

// handleBuy agora confirma com Alert.alert antes de abrir o checkout — os
// testes que compram simulam o utilizador a tocar em "Continuar".
const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
  const continueButton = buttons?.find(b => b.text === 'Continuar')
  continueButton?.onPress?.()
})

beforeEach(() => {
  mockFetchEventById.mockReset()
  mockUseLocalSearchParams.mockReturnValue({ id: 'e1' })
  mockFetchTicketTypes.mockReset()
  mockFetchTicketTypes.mockResolvedValue([])
  mockCreateCheckoutSession.mockReset()
  mockOpenURL.mockReset()
  mockOpenURL.mockResolvedValue(true as never)
  mockGetSession.mockReset()
  mockGetSession.mockResolvedValue({ data: { session: { access_token: 'token-abc' } } })
  mockAlert.mockClear()
})

describe('EventDetailScreen', () => {
  it('renders event details once loaded', async () => {
    mockFetchEventById.mockResolvedValue({
      id: 'e1',
      name: 'Show X',
      description: 'Um grande concerto',
      venue_name: 'Altice Arena',
      venue_address: 'Lisboa',
      start_datetime: '2026-08-01T20:00:00.000Z',
      end_datetime: '2026-08-01T23:00:00.000Z',
      cover_image_url: null,
    })
    const { getByText } = render(<EventDetailScreen />)

    await waitFor(() => {
      expect(getByText('Show X')).toBeTruthy()
    })
    expect(getByText('Um grande concerto')).toBeTruthy()
    expect(getByText('Altice Arena')).toBeTruthy()
  })

  it('shows a not-found message when the event does not exist', async () => {
    mockFetchEventById.mockResolvedValue(null)
    const { getByText } = render(<EventDetailScreen />)

    await waitFor(() => {
      expect(getByText('Evento não encontrado.')).toBeTruthy()
    })
  })

  it('shows ticket types and opens checkout url on purchase press', async () => {
    mockFetchEventById.mockResolvedValue({
      id: 'event-1',
      name: 'Show X',
      description: null,
      venue_name: null,
      venue_address: null,
      start_datetime: '2026-08-01T20:00:00.000Z',
      end_datetime: '2026-08-01T23:00:00.000Z',
      cover_image_url: null,
    })
    mockFetchTicketTypes.mockResolvedValue([
      { id: 'tt-1', name: 'Normal', price_cents: 2000, quantity_total: 100, quantity_sold: 0 },
    ])
    mockCreateCheckoutSession.mockResolvedValue('https://checkout.stripe.com/session-abc')

    const { getByText } = render(<EventDetailScreen />)

    await waitFor(() => {
      expect(getByText('Normal')).toBeTruthy()
    })

    fireEvent.press(getByText('Normal'))

    await waitFor(() => {
      expect(mockOpenURL).toHaveBeenCalledWith('https://checkout.stripe.com/session-abc')
    })
  })
})
