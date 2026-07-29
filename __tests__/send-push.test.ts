import { describe, it, expect, vi, afterEach } from 'vitest'
import { sendPushNotifications } from '@/lib/notifications/channels/push'

describe('sendPushNotifications', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('devolve string vazia quando não há tokens', async () => {
    const id = await sendPushNotifications({ tokens: [], title: 'T', body: 'B' })
    expect(id).toBe('')
  })

  it('envia um POST em batch para todos os tokens e devolve o primeiro id', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'receipt-1' }, { id: 'receipt-2' }] }),
    }) as unknown as typeof fetch
    global.fetch = mockFetch

    const id = await sendPushNotifications({
      tokens: ['ExponentPushToken[a]', 'ExponentPushToken[b]'],
      title: 'Evento actualizado',
      body: 'Uma etapa foi concluída',
    })

    expect(id).toBe('receipt-1')
    const [url, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('https://exp.host/--/api/v2/push/send')
    const body = JSON.parse(init.body)
    expect(body).toHaveLength(2)
    expect(body[0]).toEqual({ to: 'ExponentPushToken[a]', title: 'Evento actualizado', body: 'Uma etapa foi concluída' })
    expect(body[1].to).toBe('ExponentPushToken[b]')
  })

  it('throws on 4xx without retrying', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'Bad Request',
    }) as unknown as typeof fetch
    global.fetch = mockFetch

    await expect(sendPushNotifications({ tokens: ['ExponentPushToken[a]'], title: 'T', body: 'B' }))
      .rejects.toThrow('Expo Push 400')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('retries on 5xx up to 3 times then throws', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    }) as unknown as typeof fetch
    global.fetch = mockFetch

    await expect(sendPushNotifications({ tokens: ['ExponentPushToken[a]'], title: 'T', body: 'B' }))
      .rejects.toThrow('Expo Push 503')
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })
})
