import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { z } from 'zod'

const { mockGetUser, mockFrom, mockRateLimited, mockGenerateContent } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockRateLimited: vi.fn(),
  mockGenerateContent: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser }, from: mockFrom })),
}))
vi.mock('@/lib/ai-rate-limit', () => ({ isAiRateLimited: mockRateLimited }))
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent }
    }
  },
}))

function req(body: unknown) {
  return new NextRequest('http://localhost/api/ai/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function memberChain(member: { organization_id: string } | null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: member }),
      }),
    }),
  }
}

function geminiText(text: string) {
  mockGenerateContent.mockResolvedValue({ response: { text: () => text } })
}

function authOk() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockFrom.mockReturnValue(memberChain({ organization_id: 'org-1' }))
  mockRateLimited.mockResolvedValue(false)
}

beforeEach(() => {
  mockGetUser.mockReset()
  mockFrom.mockReset()
  mockRateLimited.mockReset()
  mockGenerateContent.mockReset()
})

describe('withAiAuth', () => {
  const schema = z.object({ x: z.string() })
  const handler = vi.fn(async () => Response.json({ ok: true }))

  beforeEach(() => handler.mockClear())

  it('401 without user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { withAiAuth } = await import('@/lib/ai/helpers')
    const res = await withAiAuth(req({ x: 'a' }), schema, handler)
    expect(res.status).toBe(401)
    expect(handler).not.toHaveBeenCalled()
  })

  it('403 without org membership', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockReturnValue(memberChain(null))
    const { withAiAuth } = await import('@/lib/ai/helpers')
    const res = await withAiAuth(req({ x: 'a' }), schema, handler)
    expect(res.status).toBe(403)
  })

  it('400 for invalid body', async () => {
    authOk()
    const { withAiAuth } = await import('@/lib/ai/helpers')
    const res = await withAiAuth(req({ nope: 1 }), schema, handler)
    expect(res.status).toBe(400)
  })

  it('429 when rate limited', async () => {
    authOk()
    mockRateLimited.mockResolvedValue(true)
    const { withAiAuth } = await import('@/lib/ai/helpers')
    const res = await withAiAuth(req({ x: 'a' }), schema, handler)
    expect(res.status).toBe(429)
  })

  it('calls handler with ctx and parsed body', async () => {
    authOk()
    const { withAiAuth } = await import('@/lib/ai/helpers')
    const res = await withAiAuth(req({ x: 'a' }), schema, handler)
    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', organizationId: 'org-1' }),
      { x: 'a' }
    )
  })
})

describe('POST /api/ai/generate-marketing-email', () => {
  const body = {
    objective: 'Apresentar a plataforma',
    contact: { name: 'Ana', company: 'ACME' },
    tone: 'formal',
    mode: 'full',
  }

  it('returns parsed subject/body json (strips markdown fences)', async () => {
    authOk()
    geminiText('```json\n{"subject": "Olá", "body": "Corpo"}\n```')
    const { POST } = await import('@/app/api/ai/generate-marketing-email/route')
    const res = await POST(req(body))
    expect(await res.json()).toEqual({ subject: 'Olá', body: 'Corpo' })
  })

  it('opening-only mode returns raw text', async () => {
    authOk()
    geminiText('Parágrafo de abertura.')
    const { POST } = await import('@/app/api/ai/generate-marketing-email/route')
    const res = await POST(req({ ...body, mode: 'opening-only' }))
    expect(await res.json()).toEqual({ opening: 'Parágrafo de abertura.' })
  })

  it('500 when model returns invalid json in full mode', async () => {
    authOk()
    geminiText('não é json')
    const { POST } = await import('@/app/api/ai/generate-marketing-email/route')
    const res = await POST(req(body))
    expect(res.status).toBe(500)
  })

  it('500 when Gemini throws', async () => {
    authOk()
    mockGenerateContent.mockRejectedValue(new Error('quota'))
    const { POST } = await import('@/app/api/ai/generate-marketing-email/route')
    const res = await POST(req(body))
    expect(res.status).toBe(500)
  })
})

describe('POST /api/ai/marketing-insights', () => {
  const CAMPAIGN = '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b'

  function sendsChain(rows: unknown[] | null) {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: rows }),
        }),
      }),
    }
  }

  it('returns empty insights without sends', async () => {
    authOk()
    mockFrom.mockImplementation((table: string) =>
      table === 'marketing_sends' ? sendsChain([]) : memberChain({ organization_id: 'org-1' })
    )
    const { POST } = await import('@/app/api/ai/marketing-insights/route')
    const res = await POST(req({ campaign_id: CAMPAIGN }))
    expect(await res.json()).toEqual({ insights: [] })
  })

  it('parses insights array from model output', async () => {
    authOk()
    mockFrom.mockImplementation((table: string) =>
      table === 'marketing_sends'
        ? sendsChain([
            { status: 'opened', marketing_contacts: { name: 'Ana', engagement_score: 5 } },
            { status: 'sent', marketing_contacts: { name: 'Rui', engagement_score: 2 } },
          ])
        : memberChain({ organization_id: 'org-1' })
    )
    geminiText('[{"type": "followup", "text": "Faz follow-up ao Rui"}]')
    const { POST } = await import('@/app/api/ai/marketing-insights/route')
    const res = await POST(req({ campaign_id: CAMPAIGN }))
    const json = await res.json()
    expect(json.insights).toHaveLength(1)
    expect(json.insights[0].type).toBe('followup')
  })

  it('falls back to raw text when model output is not json', async () => {
    authOk()
    mockFrom.mockImplementation((table: string) =>
      table === 'marketing_sends'
        ? sendsChain([{ status: 'opened', marketing_contacts: null }])
        : memberChain({ organization_id: 'org-1' })
    )
    geminiText('resposta solta')
    const { POST } = await import('@/app/api/ai/marketing-insights/route')
    const res = await POST(req({ campaign_id: CAMPAIGN }))
    const json = await res.json()
    expect(json.insights).toEqual([])
    expect(json.raw).toBe('resposta solta')
  })
})
