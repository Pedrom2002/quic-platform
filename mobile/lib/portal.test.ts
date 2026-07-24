import { describe, it, expect, jest, afterEach } from '@jest/globals'
import { fetchPortalData } from './portal'

describe('fetchPortalData', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('returns portal data on a successful response', async () => {
    const payload = {
      event: { id: 'event-1', name: 'Casamento Silva', venue_name: 'Quinta X', start_datetime: '2026-09-01T18:00:00.000Z', status: 'active' },
      items: [
        { id: 'item-1', client_label: null, title: 'Contrato assinado', status: 'completed', completed_at: '2026-08-01T10:00:00.000Z', completion_note: null, position: 0, due_at: null, category: 'Geral', files: [] },
      ],
      progress: { total: 4, completed: 1, percent: 25 },
    }
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(payload),
    })
    global.fetch = fetchMock as never

    const result = await fetchPortalData('https://app.example.com', 'token-abc')

    expect(fetchMock).toHaveBeenCalledWith('https://app.example.com/api/portal/token-abc')
    expect(result).toEqual(payload)
  })

  it('returns null when the response is not ok', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Link inválido ou expirado' }),
    })
    global.fetch = fetchMock as never

    const result = await fetchPortalData('https://app.example.com', 'bad-token')
    expect(result).toBeNull()
  })

  it('returns null when fetch throws', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('network error'))
    global.fetch = fetchMock as never

    const result = await fetchPortalData('https://app.example.com', 'token-abc')
    expect(result).toBeNull()
  })
})
