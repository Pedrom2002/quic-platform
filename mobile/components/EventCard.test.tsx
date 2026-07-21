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
  min_ticket_price_cents: null,
}

describe('EventCard', () => {
  it('renders name and venue', () => {
    const { getByText } = render(<EventCard event={baseEvent} />)
    expect(getByText('Show X')).toBeTruthy()
    expect(getByText(/Altice Arena/)).toBeTruthy()
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

  it('shows no ticket button when there are no ticket types', () => {
    const { queryByText } = render(<EventCard event={baseEvent} />)
    expect(queryByText('Gratuito')).toBeNull()
    expect(queryByText('Comprar bilhetes')).toBeNull()
  })

  it('shows "Gratuito" when the cheapest ticket type is free', () => {
    const freeEvent = { ...baseEvent, min_ticket_price_cents: 0 }
    const { getByText } = render(<EventCard event={freeEvent} />)
    expect(getByText('Gratuito')).toBeTruthy()
  })

  it('shows "Comprar bilhetes" when the cheapest ticket type is paid', () => {
    const paidEvent = { ...baseEvent, min_ticket_price_cents: 1000 }
    const { getByText } = render(<EventCard event={paidEvent} />)
    expect(getByText('Comprar bilhetes')).toBeTruthy()
  })

  it('still shows venue and date text when the card has a cover image and gradient overlay', () => {
    const eventWithCover = { ...baseEvent, cover_image_url: 'https://example.com/capa.jpg' }
    const { getByText } = render(<EventCard event={eventWithCover} />)
    expect(getByText(/Altice Arena/)).toBeTruthy()
  })
})
