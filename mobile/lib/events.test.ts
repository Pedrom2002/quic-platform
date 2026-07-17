import { describe, it, expect, jest } from '@jest/globals'
import { fetchPublicEvents, fetchEventById } from './events'

describe('fetchPublicEvents', () => {
  it('queries public events ordered by start date', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: 'e1', name: 'Show X', description: null, venue_name: null, venue_address: null, start_datetime: '2026-08-01T20:00:00Z', end_datetime: '2026-08-01T23:00:00Z', cover_image_url: null }],
      error: null,
    })
    const eq = jest.fn(() => ({ order }))
    const select = jest.fn(() => ({ eq }))
    const supabase = { from: jest.fn(() => ({ select })) } as never

    const result = await fetchPublicEvents(supabase)

    expect(supabase.from).toHaveBeenCalledWith('events')
    expect(select).toHaveBeenCalledWith(
      'id, name, description, venue_name, venue_address, start_datetime, end_datetime, cover_image_url'
    )
    expect(eq).toHaveBeenCalledWith('is_public_listed', true)
    expect(order).toHaveBeenCalledWith('start_datetime', { ascending: true })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Show X')
  })

  it('returns empty array on error', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    const eq = jest.fn(() => ({ order }))
    const select = jest.fn(() => ({ eq }))
    const supabase = { from: jest.fn(() => ({ select })) } as never

    const result = await fetchPublicEvents(supabase)
    expect(result).toEqual([])
  })
})

describe('fetchEventById', () => {
  it('queries a single event by id', async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: 'e1', name: 'Show X', description: null, venue_name: null, venue_address: null, start_datetime: '2026-08-01T20:00:00Z', end_datetime: '2026-08-01T23:00:00Z', cover_image_url: null },
      error: null,
    })
    const eq = jest.fn(() => ({ single }))
    const select = jest.fn(() => ({ eq }))
    const supabase = { from: jest.fn(() => ({ select })) } as never

    const result = await fetchEventById(supabase, 'e1')

    expect(eq).toHaveBeenCalledWith('id', 'e1')
    expect(result?.name).toBe('Show X')
  })

  it('returns null when not found', async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: null })
    const eq = jest.fn(() => ({ single }))
    const select = jest.fn(() => ({ eq }))
    const supabase = { from: jest.fn(() => ({ select })) } as never

    const result = await fetchEventById(supabase, 'missing')
    expect(result).toBeNull()
  })
})
