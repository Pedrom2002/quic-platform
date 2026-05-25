import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendSms } from '@/lib/notifications/channels/sms'

describe('sendSms', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    process.env.BREVO_API_KEY = 'test-api-key'
    process.env.BREVO_SMS_SENDER = 'QUIC'
  })

  afterEach(() => {
    global.fetch = originalFetch
    delete process.env.BREVO_API_KEY
    delete process.env.BREVO_SMS_SENDER
    vi.restoreAllMocks()
  })

  it('throws when BREVO_API_KEY is not set', async () => {
    delete process.env.BREVO_API_KEY
    await expect(sendSms({ to: '+351912345678', message: 'Test' }))
      .rejects.toThrow('BREVO_API_KEY')
  })

  it('returns messageId on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messageId: 'sms-123' }),
    }) as unknown as typeof fetch
    const id = await sendSms({ to: '+351912345678', message: 'Test message' })
    expect(id).toBe('sms-123')
  })

  it('returns empty string when messageId missing from response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch
    const id = await sendSms({ to: '+351912345678', message: 'Test' })
    expect(id).toBe('')
  })

  it('throws on 4xx without retrying', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'Bad Request',
    }) as unknown as typeof fetch
    global.fetch = mockFetch
    await expect(sendSms({ to: '+351912345678', message: 'Test' }))
      .rejects.toThrow('Brevo SMS 400')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('retries on 5xx up to 3 times then throws', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    }) as unknown as typeof fetch
    global.fetch = mockFetch
    await expect(sendSms({ to: '+351912345678', message: 'Test' }))
      .rejects.toThrow('Brevo SMS 503')
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('sends correct payload to Brevo SMS endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messageId: 'x' }),
    }) as unknown as typeof fetch
    await sendSms({ to: '+351912345678', message: 'Ola cliente' })
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('https://api.brevo.com/v3/transactionalSMS/sms')
    const body = JSON.parse(init.body)
    expect(body.sender).toBe('QUIC')
    expect(body.recipient).toBe('+351912345678')
    expect(body.content).toBe('Ola cliente')
    expect(body.type).toBe('transactional')
  })

  it('uses QUIC as default sender when BREVO_SMS_SENDER is not set', async () => {
    delete process.env.BREVO_SMS_SENDER
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messageId: 'x' }),
    }) as unknown as typeof fetch
    await sendSms({ to: '+351912345678', message: 'Test' })
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
    expect(body.sender).toBe('QUIC')
  })
})
