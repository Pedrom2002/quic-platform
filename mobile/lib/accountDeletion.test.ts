import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { deleteOwnAccount } from './accountDeletion'

describe('deleteOwnAccount', () => {
  const originalFetch = global.fetch
  const mockFetch = jest.fn<(...args: Parameters<typeof fetch>) => Promise<Partial<Response>>>()

  beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch as unknown as typeof fetch
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it('returns success when the API responds ok', async () => {
    mockFetch.mockResolvedValue({ ok: true })

    const result = await deleteOwnAccount('https://app.quic.pt', 'token-abc')

    expect(mockFetch).toHaveBeenCalledWith('https://app.quic.pt/api/account/delete', {
      method: 'POST',
      headers: { Authorization: 'Bearer token-abc' },
    })
    expect(result).toEqual({ success: true })
  })

  it('returns the server error message when the API rejects', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Demasiadas tentativas.' }),
    })

    const result = await deleteOwnAccount('https://app.quic.pt', 'token-abc')

    expect(result).toEqual({ success: false, error: 'Demasiadas tentativas.' })
  })

  it('returns a generic error when the response has no error body', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => { throw new Error('not json') },
    })

    const result = await deleteOwnAccount('https://app.quic.pt', 'token-abc')

    expect(result).toEqual({ success: false, error: 'Não foi possível eliminar a conta.' })
  })

  it('returns a connection error when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('network down'))

    const result = await deleteOwnAccount('https://app.quic.pt', 'token-abc')

    expect(result).toEqual({ success: false, error: 'Erro de ligação. Tenta novamente.' })
  })
})
