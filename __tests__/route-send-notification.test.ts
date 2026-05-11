import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

let mockUpdate: ReturnType<typeof vi.fn>
let mockInsert: ReturnType<typeof vi.fn>
let mockSingle: ReturnType<typeof vi.fn>
let mockSelect: ReturnType<typeof vi.fn>
let mockEq: ReturnType<typeof vi.fn>
let mockFrom: ReturnType<typeof vi.fn>

const makeFromChain = (table: string) => {
  if (table === 'events') {
    return {
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    }
  }
  return {
    update: mockUpdate,
    insert: mockInsert,
    eq: mockEq,
  }
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}))

vi.mock('@/lib/qstash/verify', () => ({
  verifyQStashSignature: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/notifications/channels/email', () => ({
  sendEmail: vi.fn().mockResolvedValue('msg-provider-id'),
  buildEmailHtml: vi.fn().mockReturnValue('<html>email</html>'),
}))

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => ({ body, status: init?.status ?? 200 })),
  },
}))

import { POST } from '@/app/api/workers/send-notification/route'
import { verifyQStashSignature } from '@/lib/qstash/verify'
import { sendEmail } from '@/lib/notifications/channels/email'

const basePayload = {
  job_id: 'job-1',
  event_id: 'ev-1',
  client_id: 'cl-1',
  channel: 'email' as const,
  rendered_subject: 'Test Subject',
  rendered_body: 'Test body text',
  client_email: 'client@example.com',
  client_phone: null,
  client_whatsapp: null,
}

function makeRequest(payload: unknown) {
  return new Request('http://localhost/api/workers/send-notification', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'content-type': 'application/json' },
  })
}

describe('POST /api/workers/send-notification', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    mockUpdate = vi.fn().mockReturnValue({ eq: eqMock })
    mockInsert = vi.fn().mockResolvedValue({ error: null })
    mockSingle = vi.fn().mockResolvedValue({ data: { name: 'Concerto Test' } })
    mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    mockEq = vi.fn().mockReturnValue({ single: mockSingle })

    mockFrom = vi.fn((table: string) => {
      if (table === 'events') {
        return {
          select: mockSelect,
          eq: mockEq,
          single: mockSingle,
        }
      }
      return {
        update: mockUpdate,
        insert: mockInsert,
        eq: eqMock,
      }
    })

    // Reset mocks for verify and email
    vi.mocked(verifyQStashSignature).mockResolvedValue(true)
    vi.mocked(sendEmail).mockResolvedValue('msg-provider-id')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when QStash signature is invalid', async () => {
    vi.mocked(verifyQStashSignature).mockResolvedValueOnce(false)
    const res = await POST(makeRequest(basePayload))
    expect(res.status).toBe(401)
  })

  it('sends email and returns 200 for email channel', async () => {
    const res = await POST(makeRequest(basePayload))
    expect(res.status).toBe(200)
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'client@example.com',
        subject: 'Test Subject',
      })
    )
    expect((res as { body: { success: boolean } }).body.success).toBe(true)
  })

  it('uses default subject when rendered_subject is null', async () => {
    const res = await POST(makeRequest({ ...basePayload, rendered_subject: null }))
    expect(res.status).toBe(200)
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Atualização do seu evento — Quic',
      })
    )
  })

  it('skips email send for non-email channel', async () => {
    const res = await POST(
      makeRequest({ ...basePayload, channel: 'sms', client_phone: '+351912345678' })
    )
    expect(res.status).toBe(200)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('returns 500 when client_email is missing for email channel', async () => {
    const res = await POST(makeRequest({ ...basePayload, client_email: null }))
    expect(res.status).toBe(500)
  })

  it('returns 500 and logs failure when sendEmail throws', async () => {
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error('Brevo API down'))
    const res = await POST(makeRequest(basePayload))
    expect(res.status).toBe(500)
    expect((res as { body: { error: string } }).body.error).toContain('Brevo API down')
  })

  it('uses twilio as provider for non-email channels', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    mockInsert = vi.fn().mockResolvedValue({ error: null })
    mockFrom = vi.fn((table: string) => {
      if (table === 'events') {
        return {
          select: mockSelect,
          eq: mockEq,
          single: mockSingle,
        }
      }
      return {
        update: mockUpdate,
        insert: mockInsert,
        eq: eqMock,
      }
    })

    await POST(makeRequest({ ...basePayload, channel: 'whatsapp' }))
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'twilio', channel: 'whatsapp' })
    )
  })

  it('uses brevo as provider for email channel', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    mockInsert = vi.fn().mockResolvedValue({ error: null })
    mockFrom = vi.fn((table: string) => {
      if (table === 'events') {
        return {
          select: mockSelect,
          eq: mockEq,
          single: mockSingle,
        }
      }
      return {
        update: mockUpdate,
        insert: mockInsert,
        eq: eqMock,
      }
    })

    await POST(makeRequest(basePayload))
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'brevo', channel: 'email' })
    )
  })
})
