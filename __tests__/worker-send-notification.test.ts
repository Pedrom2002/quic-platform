import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockVerify = vi.fn()
const mockSendPush = vi.fn()
const mockUpdate = vi.fn()
const mockInsertLog = vi.fn()
const mockSelectTokens = vi.fn()
const mockDeleteTokens = vi.fn()

vi.mock('@/lib/qstash/verify', () => ({ verifyQStashSignature: () => mockVerify() }))
vi.mock('@/lib/notifications/channels/push', () => ({
  sendPushNotifications: (...args: unknown[]) => mockSendPush(...args),
}))
vi.mock('@/lib/notifications/channels/email', () => ({
  sendEmail: vi.fn(),
  buildEmailHtml: vi.fn(),
}))
vi.mock('@/lib/notifications/channels/sms', () => ({ sendSms: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'client_push_tokens') {
        return {
          select: () => ({ eq: mockSelectTokens }),
          delete: () => ({ eq: () => ({ in: mockDeleteTokens }) }),
        }
      }
      if (table === 'events') {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { name: 'Casamento Silva' } }) }) }) }
      }
      if (table === 'notification_jobs') {
        return {
          update: (payload: { status?: string }) => {
            if (payload.status === 'processing') {
              return { eq: () => ({ in: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'job-1' } }) }) }) }) }
            }
            return { eq: mockUpdate }
          },
        }
      }
      if (table === 'notification_log') {
        return { insert: mockInsertLog }
      }
      throw new Error(`unexpected table ${table}`)
    },
  }),
}))

import { POST } from '@/app/api/workers/send-notification/route'

function makePayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    job_id: 'job-1',
    event_id: 'event-1',
    client_id: 'client-1',
    channel: 'push',
    rendered_subject: null,
    rendered_body: 'Uma etapa foi concluída',
    client_email: null,
    client_phone: null,
    client_whatsapp: null,
    ...overrides,
  }
}

function makeRequest(payload: unknown) {
  return new Request('https://example.com/api/workers/send-notification', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

describe('POST /api/workers/send-notification — canal push', () => {
  beforeEach(() => {
    mockVerify.mockReset().mockResolvedValue(true)
    mockSendPush.mockReset().mockResolvedValue({ id: 'receipt-1', invalidTokens: [] })
    mockUpdate.mockReset().mockResolvedValue({ error: null })
    mockInsertLog.mockReset().mockResolvedValue({ error: null })
    mockSelectTokens.mockReset()
    mockDeleteTokens.mockReset().mockResolvedValue({ error: null })
  })

  it('envia push para todos os tokens do cliente', async () => {
    mockSelectTokens.mockResolvedValue({ data: [{ token: 'ExponentPushToken[a]' }, { token: 'ExponentPushToken[b]' }] })

    const response = await POST(makeRequest(makePayload()))

    expect(response.status).toBe(200)
    expect(mockSendPush).toHaveBeenCalledWith({
      tokens: ['ExponentPushToken[a]', 'ExponentPushToken[b]'],
      title: 'Casamento Silva',
      body: 'Uma etapa foi concluída',
    })
  })

  it('marca delivered sem enviar quando o cliente não tem tokens registados', async () => {
    mockSelectTokens.mockResolvedValue({ data: [] })

    const response = await POST(makeRequest(makePayload()))

    expect(response.status).toBe(200)
    expect(mockSendPush).not.toHaveBeenCalled()
  })

  it('apaga tokens invalidos reportados pela Expo Push API', async () => {
    mockSelectTokens.mockResolvedValue({ data: [{ token: 'ExponentPushToken[a]' }, { token: 'ExponentPushToken[dead]' }] })
    mockSendPush.mockResolvedValue({ id: 'receipt-1', invalidTokens: ['ExponentPushToken[dead]'] })

    const response = await POST(makeRequest(makePayload()))

    expect(response.status).toBe(200)
    expect(mockDeleteTokens).toHaveBeenCalledWith('token', ['ExponentPushToken[dead]'])
  })

  it('não tenta apagar nada quando não há tokens invalidos', async () => {
    mockSelectTokens.mockResolvedValue({ data: [{ token: 'ExponentPushToken[a]' }] })
    mockSendPush.mockResolvedValue({ id: 'receipt-1', invalidTokens: [] })

    const response = await POST(makeRequest(makePayload()))

    expect(response.status).toBe(200)
    expect(mockDeleteTokens).not.toHaveBeenCalled()
  })
})
