import { describe, it, expect, vi, beforeEach } from 'vitest'

process.env.QSTASH_URL = 'https://qstash.example.com'
process.env.QSTASH_TOKEN = 'test-qstash-token'

const { mockFrom, mockRpc, mockVerify, mockPollReplies } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockVerify: vi.fn(),
  mockPollReplies: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))
vi.mock('@/lib/qstash/verify', () => ({ verifyQStashSignature: mockVerify }))
vi.mock('@/lib/marketing/imap', () => ({ pollReplies: mockPollReplies }))

const CRON = 'test-cron-secret-minimum-32-chars-pad!'

function chain(result: unknown, calls?: { updates?: unknown[] }) {
  const c: Record<string, unknown> = {}
  const self = () => c
  for (const m of ['select', 'eq', 'in', 'or', 'gte', 'limit', 'maybeSingle', 'single']) {
    c[m] = vi.fn(self)
  }
  c.update = vi.fn((payload: unknown) => {
    calls?.updates?.push(payload)
    return c
  })
  ;(c as { then?: unknown }).then = (resolve: (v: unknown) => void) => resolve(result)
  return c
}

function post(headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/x', { method: 'POST', headers, body: '{}' })
}

beforeEach(() => {
  mockFrom.mockReset()
  mockRpc.mockReset()
  mockVerify.mockReset()
  mockPollReplies.mockReset()
  vi.unstubAllGlobals()
})

describe('POST /api/cron/marketing-retry', () => {
  it('401 without cron secret', async () => {
    const { POST } = await import('@/app/api/cron/marketing-retry/route')
    const res = await POST(post())
    expect(res.status).toBe(401)
  })

  it('retried 0 when there are no recent failures', async () => {
    mockFrom.mockReturnValueOnce(chain({ data: [] }))
    const { POST } = await import('@/app/api/cron/marketing-retry/route')
    const res = await POST(post({ authorization: `Bearer ${CRON}` }))
    expect(await res.json()).toEqual({ retried: 0 })
  })

  it('requeues recent failure via qstash and marks pending', async () => {
    const now = new Date().toISOString()
    const updates: unknown[] = []
    mockFrom
      .mockReturnValueOnce(chain({ data: [{ id: 'c1' }] }))
      .mockReturnValueOnce(
        chain({
          data: [
            {
              id: 's1',
              campaign_id: 'c1',
              contact_id: 'ct1',
              error: 'timeout',
              marketing_campaigns: { created_by: 'user-1', created_at: now },
            },
          ],
        })
      )
      .mockReturnValueOnce(chain({ error: null }, { updates }))
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const { POST } = await import('@/app/api/cron/marketing-retry/route')
    const res = await POST(post({ authorization: `Bearer ${CRON}` }))
    expect(await res.json()).toEqual({ retried: 1 })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect((updates[0] as Record<string, unknown>).status).toBe('pending')
  })

  it('skips permanent failures (550/invalid)', async () => {
    const now = new Date().toISOString()
    mockFrom
      .mockReturnValueOnce(chain({ data: [{ id: 'c1' }] }))
      .mockReturnValueOnce(
        chain({
          data: [
            {
              id: 's1',
              campaign_id: 'c1',
              contact_id: 'ct1',
              error: '550 mailbox not found',
              marketing_campaigns: { created_by: 'user-1', created_at: now },
            },
          ],
        })
      )
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { POST } = await import('@/app/api/cron/marketing-retry/route')
    const res = await POST(post({ authorization: `Bearer ${CRON}` }))
    expect(await res.json()).toEqual({ retried: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('POST /api/marketing/reply-poll', () => {
  it('401 with invalid qstash signature', async () => {
    mockVerify.mockResolvedValue(false)
    const { POST } = await import('@/app/api/marketing/reply-poll/route')
    const res = await POST(post())
    expect(res.status).toBe(401)
  })

  it('processed 0 without active senders', async () => {
    mockVerify.mockResolvedValue(true)
    mockFrom.mockReturnValueOnce(chain({ data: [] }))
    const { POST } = await import('@/app/api/marketing/reply-poll/route')
    const res = await POST(post())
    expect(await res.json()).toEqual({ processed: 0 })
  })

  it('matches reply to send, updates status and increments score', async () => {
    mockVerify.mockResolvedValue(true)
    mockPollReplies.mockResolvedValue([
      {
        inReplyTo: '<msg-1@example.com>',
        references: [],
        receivedAt: new Date('2026-07-16T10:00:00Z'),
        snippet: 'Obrigado, tenho interesse',
      },
    ])
    mockRpc.mockResolvedValue({ error: null })
    const updates: unknown[] = []
    mockFrom
      .mockReturnValueOnce(chain({ data: [{ created_by: 'user-1' }] })) // campanhas ativas
      .mockReturnValueOnce(
        chain({ data: { host: 'imap.example.com', username: 'u', password_enc: 'x' } })
      ) // credenciais
      .mockReturnValueOnce(chain({ data: { id: 's1', contact_id: 'ct1', replied_at: null } })) // send match
      .mockReturnValueOnce(chain({ error: null }, { updates })) // update send

    const { POST } = await import('@/app/api/marketing/reply-poll/route')
    const res = await POST(post())
    expect(await res.json()).toEqual({ processed: 1 })
    expect((updates[0] as Record<string, unknown>).status).toBe('replied')
    expect(mockRpc).toHaveBeenCalledWith('marketing_increment_score', expect.objectContaining({
      p_contact_id: 'ct1',
    }))
  })

  it('continues when IMAP fails for a sender', async () => {
    mockVerify.mockResolvedValue(true)
    mockPollReplies.mockRejectedValue(new Error('IMAP down'))
    mockFrom
      .mockReturnValueOnce(chain({ data: [{ created_by: 'user-1' }] }))
      .mockReturnValueOnce(
        chain({ data: { host: 'imap.example.com', username: 'u', password_enc: 'x' } })
      )
    const { POST } = await import('@/app/api/marketing/reply-poll/route')
    const res = await POST(post())
    expect(await res.json()).toEqual({ processed: 0 })
  })
})
