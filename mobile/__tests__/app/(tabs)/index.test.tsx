import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import InicioScreen from '../../../app/(tabs)/index'

const mockFetchPublicEvents = jest.fn()
const mockPush = jest.fn()

jest.mock('../../../lib/events', () => ({
  fetchPublicEvents: (...args: unknown[]) => mockFetchPublicEvents(...args),
}))
jest.mock('../../../lib/supabase', () => ({ supabase: {} }))
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

beforeEach(() => {
  mockFetchPublicEvents.mockReset()
  mockPush.mockReset()
})

describe('InicioScreen', () => {
  it('shows empty state when there are no events', async () => {
    mockFetchPublicEvents.mockResolvedValue([])
    const { getByText } = render(<InicioScreen />)

    await waitFor(() => {
      expect(getByText('Sem eventos agendados.')).toBeTruthy()
    })
  })

  it('renders a list of events', async () => {
    mockFetchPublicEvents.mockResolvedValue([
      {
        id: 'e1',
        name: 'Show X',
        description: null,
        venue_name: 'Altice Arena',
        venue_address: null,
        start_datetime: '2026-08-01T20:00:00.000Z',
        end_datetime: '2026-08-01T23:00:00.000Z',
        cover_image_url: null,
      },
    ])
    const { getByText } = render(<InicioScreen />)

    await waitFor(() => {
      expect(getByText('Show X')).toBeTruthy()
    })
  })

  it('navigates to the event detail screen when a card is pressed', async () => {
    mockFetchPublicEvents.mockResolvedValue([
      {
        id: 'e1',
        name: 'Show X',
        description: null,
        venue_name: 'Altice Arena',
        venue_address: null,
        start_datetime: '2026-08-01T20:00:00.000Z',
        end_datetime: '2026-08-01T23:00:00.000Z',
        cover_image_url: null,
      },
    ])
    const { getByText } = render(<InicioScreen />)

    await waitFor(() => {
      expect(getByText('Show X')).toBeTruthy()
    })
    fireEvent.press(getByText('Show X'))

    expect(mockPush).toHaveBeenCalledWith('/evento/e1')
  })
})
