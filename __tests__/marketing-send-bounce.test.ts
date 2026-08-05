/**
 * Tests for:
 *   - POST /api/marketing/send
 *   - POST /api/marketing/bounce-poll
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockVerifyQStash, mockSendMarketingEmail, mockPollBounces, mockFrom, mockRpc, mockNextResponseJson } = vi.hoisted(() => ({
  mockVerifyQStash: vi.fn().mockResolvedValue(true),
  mockSendMarketingEmail: vi.fn().mockResolvedValue('msg-id-123'),
  mockPollBounces: vi.fn().mockResolvedValue([]),
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockNextResponseJson: vi.fn((body: unknown, init?: { status?: number }) => ({
    body,
    status: init?.status ?? 200,
  })),
}))

vi.mock('@/lib/qstash/verify', () => ({
  verifyQStashSignature: mockVerifyQStash,
}))

vi.mock('@/lib/marketing/smtp', () => ({
  sendMarketingEmail: mockSendMarketingEmail,
}))

vi.mock('@/lib/marketing/imap', () => ({
  pollBounces: mockPollBounces,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom, rpc: mockRpc })),
}))

vi.mock('next/server', () => ({
  NextResponse: {
    json: mockNextResponseJson,
  },
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a mock Request with a controllable clone() method.
 * This avoids issues with Node.js's ReadableStream / body-locking behaviour
 * when clone() is called multiple times in the route handler.
 */
function makeMockRequest(body: unknown): Request {
  const bodyStr = JSON.stringify(body)
  const makeClone = () => ({
    json: vi.fn().mockResolvedValue(JSON.parse(bodyStr)),
    text: vi.fn().mockResolvedValue(bodyStr),
    headers: new Headers({ 'upstash-signature': 'sig', 'content-type': 'application/json' }),
    clone: () => makeClone(),
  })
  const req = {
    ...makeClone(),
    clone: vi.fn(() => makeClone()),
  }
  return req as unknown as Request
}

function makeSingleChain(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data }),
  }
}

function makeUpdateChain(error: unknown = null) {
  return {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error }),
    }),
  }
}

function makeMaybeSingleChain(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data }),
  }
}

// Must be valid RFC4122 UUIDs (zod validates version digit and variant)
const VALID_PAYLOAD = {
  send_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  campaign_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  contact_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  sender_user_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  is_followup: false,
}

// ─── POST /api/marketing/send ─────────────────────────────────────────────────

describe('POST /api/marketing/send', () => {
  beforeEach(() => {
    mockFrom.mockReset()
    mockRpc.mockReset()
    // marketing_check_warmup_limit → allowed; marketing_record_send → ignored
    mockRpc.mockResolvedValue({ data: { allowed: true, daily_limit: 50, sent_today: 0 } })
    mockVerifyQStash.mockReset()
    mockVerifyQStash.mockResolvedValue(true)
    mockSendMarketingEmail.mockReset()
    mockSendMarketingEmail.mockResolvedValue('msg-123')
    mockNextResponseJson.mockImplementation((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }))
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
  })

  it('returns 401 when QStash signature is invalid', async () => {
    mockVerifyQStash.mockResolvedValueOnce(false)
    const { POST } = await import('@/app/api/marketing/send/route')
    const res = await POST(makeMockRequest(VALID_PAYLOAD))
    expect((res as { status: number }).status).toBe(401)
  })

  it('returns 400 when payload schema is invalid', async () => {
    const { POST } = await import('@/app/api/marketing/send/route')
    const res = await POST(makeMockRequest({ send_id: 'not-a-uuid' }))
    expect((res as { status: number }).status).toBe(400)
  })

  it('returns 500 when campaign/contact/smtp data is missing', async () => {
    // Chain must have both single() (for SELECT) and update().eq() (for the catch-block update)
    const nullChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }
    mockFrom.mockReturnValue(nullChain)
    const { POST } = await import('@/app/api/marketing/send/route')
    const res = await POST(makeMockRequest(VALID_PAYLOAD))
    expect((res as { status: number }).status).toBe(500)
  })

  it('returns 200 on successful send', async () => {
    const campaign = {
      id: 'camp-1',
      subject_template: 'Hello {{nome}}',
      body_template: '<p>Hi {{nome}} from {{empresa}}</p>',
    }
    const contact = { id: 'c1', email: 'c@x.com', name: 'João', company: 'ACME', role: 'CEO' }
    const smtpCreds = { host: 'smtp.example.com', port: 587, username: 'u', password_enc: 'enc', from_name: 'Sender' }
    const updateChain = makeUpdateChain()

    mockFrom.mockImplementation((table: string) => {
      if (table === 'marketing_campaigns') return makeSingleChain(campaign)
      if (table === 'marketing_contacts') return makeSingleChain(contact)
      if (table === 'team_smtp_credentials') return makeSingleChain(smtpCreds)
      if (table === 'marketing_sends') return updateChain
      return {}
    })

    const { POST } = await import('@/app/api/marketing/send/route')
    const res = await POST(makeMockRequest(VALID_PAYLOAD))
    expect((res as { status: number }).status).toBe(200)
    expect(mockSendMarketingEmail).toHaveBeenCalledTimes(1)
  })

  it('sends followup with custom subject/body when is_followup=true', async () => {
    const campaign = { id: 'camp-1', subject_template: 'Default', body_template: '<p>Default</p>' }
    const contact = { id: 'c1', email: 'c@x.com', name: 'Maria', company: 'XYZ', role: null }
    const smtpCreds = { host: 'smtp.x.com', port: 465, username: 'u', password_enc: 'e', from_name: 'S' }
    const updateChain = makeUpdateChain()

    mockFrom.mockImplementation((table: string) => {
      if (table === 'marketing_campaigns') return makeSingleChain(campaign)
      if (table === 'marketing_contacts') return makeSingleChain(contact)
      if (table === 'team_smtp_credentials') return makeSingleChain(smtpCreds)
      if (table === 'marketing_sends') return updateChain
      return {}
    })

    const { POST } = await import('@/app/api/marketing/send/route')
    const res = await POST(makeMockRequest({
      ...VALID_PAYLOAD,
      is_followup: true,
      followup_subject: 'Follow-up para {{nome}}',
      followup_body: '<p>Follow-up for {{nome}}</p>',
    }))
    expect((res as { status: number }).status).toBe(200)
    const [callArgs] = mockSendMarketingEmail.mock.calls as [{ subject: string }][]
    expect(callArgs[0].subject).toContain('Maria')
  })

  it('returns 500 and marks send failed when sendMarketingEmail throws', async () => {
    const campaign = { id: 'camp-1', subject_template: 'Sub', body_template: 'Body' }
    const contact = { id: 'c1', email: 'c@x.com', name: null, company: null, role: null }
    const smtpCreds = { host: 'h', port: 587, username: 'u', password_enc: 'e', from_name: 'F' }
    const updateChain = makeUpdateChain()

    mockFrom.mockImplementation((table: string) => {
      if (table === 'marketing_campaigns') return makeSingleChain(campaign)
      if (table === 'marketing_contacts') return makeSingleChain(contact)
      if (table === 'team_smtp_credentials') return makeSingleChain(smtpCreds)
      if (table === 'marketing_sends') return updateChain
      return {}
    })
    mockSendMarketingEmail.mockRejectedValueOnce(new Error('SMTP connection refused'))

    const { POST } = await import('@/app/api/marketing/send/route')
    const res = await POST(makeMockRequest(VALID_PAYLOAD))
    expect((res as { status: number }).status).toBe(500)
  })
})

// ─── GET /api/marketing/bounce-poll (Vercel Cron + CRON_SECRET) ──────────────

const CRON_SECRET = 'test-cron-secret-minimum-32-chars-pad!'
function makeCronRequest(authHeader?: string): Request {
  return new Request('http://localhost/api/marketing/bounce-poll', {
    method: 'GET',
    headers: authHeader ? { authorization: authHeader } : {},
  })
}

describe('GET /api/marketing/bounce-poll', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = CRON_SECRET
    mockFrom.mockReset()
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockPollBounces.mockReset()
    mockPollBounces.mockResolvedValue([])
    mockNextResponseJson.mockImplementation((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }))
  })

  it('returns 401 when authorization header is missing', async () => {
    const { GET } = await import('@/app/api/marketing/bounce-poll/route')
    const res = await GET(makeCronRequest())
    expect((res as { status: number }).status).toBe(401)
  })

  it('returns 401 when authorization header is wrong', async () => {
    const { GET } = await import('@/app/api/marketing/bounce-poll/route')
    const res = await GET(makeCronRequest('Bearer wrong-secret'))
    expect((res as { status: number }).status).toBe(401)
  })

  it('returns {processed:0} when no active senders', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [] }),
    })

    const { GET } = await import('@/app/api/marketing/bounce-poll/route')
    const res = await GET(makeCronRequest(`Bearer ${CRON_SECRET}`))
    expect((res as unknown as { body: { processed: number } }).body.processed).toBe(0)
  })

  it('skips user when IMAP credentials are missing', async () => {
    const senders = [{ created_by: 'user-no-creds' }]
    mockFrom.mockImplementation((table: string) => {
      if (table === 'marketing_campaigns') {
        return { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: senders }) }
      }
      if (table === 'team_smtp_credentials') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) }
      }
      return {}
    })

    const { GET } = await import('@/app/api/marketing/bounce-poll/route')
    const res = await GET(makeCronRequest(`Bearer ${CRON_SECRET}`))
    expect(mockPollBounces).not.toHaveBeenCalled()
    expect((res as unknown as { body: { processed: number } }).body.processed).toBe(0)
  })

  it('handles IMAP errors gracefully and returns 200', async () => {
    const senders = [{ created_by: 'user-1' }]
    const creds = { host: 'imap.x.com', username: 'u', password_enc: 'enc' }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'marketing_campaigns') {
        return { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: senders }) }
      }
      if (table === 'team_smtp_credentials') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: creds }) }
      }
      return {}
    })
    mockPollBounces.mockRejectedValueOnce(new Error('IMAP connection refused'))

    const { GET } = await import('@/app/api/marketing/bounce-poll/route')
    const res = await GET(makeCronRequest(`Bearer ${CRON_SECRET}`))
    expect((res as { status: number }).status).toBe(200)
  })

  it('skips contact update when bounced email has no matching contact', async () => {
    const senders = [{ created_by: 'user-1' }]
    const creds = { host: 'imap.x.com', username: 'u', password_enc: 'enc' }
    const bounceInfo = { bouncedEmail: 'unknown@x.com', rawSubject: 'Delivery failed' }

    mockPollBounces.mockResolvedValueOnce([bounceInfo])

    let callCount = 0
    mockFrom.mockImplementation((table: string) => {
      callCount++
      if (callCount === 1) {
        return { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: senders }) }
      }
      if (table === 'team_smtp_credentials') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: creds }) }
      }
      if (table === 'marketing_contacts') {
        return { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [] }) }
      }
      return {}
    })

    const { GET } = await import('@/app/api/marketing/bounce-poll/route')
    const res = await GET(makeCronRequest(`Bearer ${CRON_SECRET}`))
    expect(mockRpc).not.toHaveBeenCalled()
    expect((res as { status: number }).status).toBe(200)
  })

  it('processes bounces: updates send, contact and score when contact found', async () => {
    const senders = [{ created_by: 'user-1' }]
    const creds = { host: 'imap.x.com', username: 'u', password_enc: 'enc' }
    const bounceInfo = { bouncedEmail: 'bounce@x.com', rawSubject: 'Delivery failed' }
    const contact = { id: 'c1' }

    mockPollBounces.mockResolvedValueOnce([bounceInfo])

    let callCount = 0
    mockFrom.mockImplementation((table: string) => {
      callCount++
      if (callCount === 1) {
        return { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: senders }) }
      }
      if (table === 'team_smtp_credentials') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: creds }) }
      }
      if (table === 'marketing_contacts') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [{ id: contact.id, email: bounceInfo.bouncedEmail }] }),
          eq: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        }
      }
      if (table === 'marketing_sends') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }
      }
      return {}
    })

    const { GET } = await import('@/app/api/marketing/bounce-poll/route')
    const res = await GET(makeCronRequest(`Bearer ${CRON_SECRET}`))
    expect((res as unknown as { body: { processed: number } }).body.processed).toBeGreaterThanOrEqual(1)
    expect(mockRpc).toHaveBeenCalledWith('marketing_increment_score', expect.objectContaining({ p_contact_id: 'c1' }))
  })
})
