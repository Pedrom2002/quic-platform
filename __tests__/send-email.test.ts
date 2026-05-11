import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendEmail } from '@/lib/notifications/channels/email'

describe('sendEmail', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    process.env.BREVO_API_KEY = 'test-api-key'
    process.env.EMAIL_FROM = 'QUIC <noreply@quic.pt>'
  })

  afterEach(() => {
    global.fetch = originalFetch
    delete process.env.BREVO_API_KEY
    delete process.env.EMAIL_FROM
    vi.restoreAllMocks()
  })

  it('throws when BREVO_API_KEY is not set', async () => {
    delete process.env.BREVO_API_KEY
    await expect(sendEmail({ to: 'a@b.com', subject: 'S', html: '<p>H</p>' }))
      .rejects.toThrow('BREVO_API_KEY')
  })

  it('parses "Name <email>" format for sender', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messageId: 'msg-1' }),
    }) as unknown as typeof fetch
    await sendEmail({ to: 'x@y.com', subject: 'Hi', html: '<p>body</p>' })
    const capturedBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
    expect(capturedBody.sender).toEqual({ name: 'QUIC', email: 'noreply@quic.pt' })
  })

  it('uses raw email as sender when EMAIL_FROM has no name part', async () => {
    process.env.EMAIL_FROM = 'noreply@quic.pt'
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messageId: 'msg-2' }),
    }) as unknown as typeof fetch
    await sendEmail({ to: 'x@y.com', subject: 'Hi', html: '<p>body</p>' })
    const capturedBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
    expect(capturedBody.sender).toEqual({ email: 'noreply@quic.pt' })
  })

  it('returns messageId on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messageId: 'abc-123' }),
    }) as unknown as typeof fetch
    const id = await sendEmail({ to: 'x@y.com', subject: 'Hi', html: '<p>body</p>' })
    expect(id).toBe('abc-123')
  })

  it('returns empty string when messageId missing from response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch
    const id = await sendEmail({ to: 'x@y.com', subject: 'Hi', html: '<p>body</p>' })
    expect(id).toBe('')
  })

  it('throws when Brevo returns non-ok status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => 'Unprocessable',
    }) as unknown as typeof fetch
    await expect(sendEmail({ to: 'x@y.com', subject: 'Hi', html: '<p>body</p>' }))
      .rejects.toThrow('Brevo 422')
  })

  it('passes toName in the recipient array', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messageId: 'x' }),
    }) as unknown as typeof fetch
    await sendEmail({ to: 'x@y.com', toName: 'Alice', subject: 'Hi', html: '<p>body</p>' })
    const capturedBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
    expect(capturedBody.to[0].name).toBe('Alice')
  })
})
