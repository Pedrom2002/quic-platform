import { describe, it, expect, vi, beforeEach } from 'vitest'

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
