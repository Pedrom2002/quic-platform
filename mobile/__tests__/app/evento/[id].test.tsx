import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, waitFor } from '@testing-library/react-native'
import EventDetailScreen from '../../../app/evento/[id]'

const mockFetchEventById = jest.fn()
const mockUseLocalSearchParams = jest.fn()

jest.mock('../../../lib/events', () => ({
  fetchEventById: (...args: unknown[]) => mockFetchEventById(...args),
}))
jest.mock('../../../lib/supabase', () => ({ supabase: {} }))
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}))

beforeEach(() => {
  mockFetchEventById.mockReset()
  mockUseLocalSearchParams.mockReturnValue({ id: 'e1' })
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
})
