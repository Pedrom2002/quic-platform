import { describe, it, expect } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { EventCard } from './EventCard'
import type { PublicEvent } from '../lib/events'

const baseEvent: PublicEvent = {
  id: 'e1',
  name: 'Show X',
  description: 'Um grande concerto',
  venue_name: 'Altice Arena',
  venue_address: 'Lisboa',
  start_datetime: '2026-08-01T20:00:00.000Z',
  end_datetime: '2026-08-01T23:00:00.000Z',
  cover_image_url: null,
}

describe('EventCard', () => {
  it('renders name and venue', () => {
    const { getByText } = render(<EventCard event={baseEvent} />)
    expect(getByText('Show X')).toBeTruthy()
    expect(getByText('Altice Arena')).toBeTruthy()
  })

  it('shows a placeholder when there is no cover image', () => {
    const { getByTestId } = render(<EventCard event={baseEvent} />)
    expect(getByTestId('event-card-image-placeholder')).toBeTruthy()
  })

  it('renders the cover image when present', () => {
    const eventWithCover = { ...baseEvent, cover_image_url: 'https://example.com/capa.jpg' }
    const { queryByTestId } = render(<EventCard event={eventWithCover} />)
    expect(queryByTestId('event-card-image-placeholder')).toBeNull()
  })
})
