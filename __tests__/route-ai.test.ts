import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Google Generative AI before any route imports
const mockGenerateContentStream = vi.fn()
const mockGenerateContent = vi.fn()
const mockGeminiInstance = { getGenerativeModel: vi.fn() }

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(function () { return mockGeminiInstance }),
}))

vi.mock('@/lib/ai-rate-limit', () => ({
  isAiRateLimited: vi.fn().mockResolvedValue(false),
}))

vi.mock('@/lib/audit', () => ({
  audit: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { isAiRateLimited } from '@/lib/ai-rate-limit'
import { createClient } from '@/lib/supabase/server'

// Valid UUIDs - must satisfy Zod v4's stricter UUID pattern:
//   3rd group starts with [1-8] (version), 4th group starts with [89abAB] (variant)
const VALID_EVENT_ID = 'a1b2c3d4-e5f6-4789-8abc-def012345678'
const VALID_TASK_ID = 'd4c3b2a1-f6e5-4987-abcd-678901234567'

const defaultMember = { id: 'm1', full_name: 'Test', organization_id: 'org-1' }
const defaultEvent = {
  id: VALID_EVENT_ID,
  name: 'Concert',
  start_datetime: '2026-06-15T20:00:00Z',
  status: 'active',
  venue_name: null,
}
const defaultTask = {
  id: VALID_TASK_ID,
  title: 'Setup',
  description: null,
  parent_id: null,
  event_id: VALID_EVENT_ID,
}

// Build a minimal supabase mock for guard-clause tests
function makeSupabase(config: {
  user?: unknown
  member?: unknown
  eventData?: unknown
  taskData?: unknown
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: config.user !== undefined ? config.user : { id: 'user-1' } },
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'team_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: config.member !== undefined ? config.member : null }),
        }
      }
      if (table === 'events') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: config.eventData !== undefined ? config.eventData : null }),
        }
      }
      if (table === 'event_tasks') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: config.taskData !== undefined ? config.taskData : null }),
          not: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [] }),
        }
      }
      // Default: return empty for any other table
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], count: 0 }),
      }
    }),
  }
}

// Helper: create a Request-like mock whose .json() returns a resolved Promise
// Routes call: await req.json().catch(() => null) — a resolved Promise's .catch() is a no-op
function makeNextRequest(body: unknown): Request {
  return {
    json: () => Promise.resolve(body),
  } as unknown as Request
}

beforeEach(() => {
  process.env.GEMINI_API_KEY = 'test-api-key'
  vi.clearAllMocks()
  mockGeminiInstance.getGenerativeModel.mockReturnValue({
    generateContentStream: mockGenerateContentStream,
    generateContent: mockGenerateContent,
  })
  mockGenerateContentStream.mockImplementation(() => Promise.resolve({
    stream: (async function* () { yield { text: () => 'Hello' } })(),
  }))
  mockGenerateContent.mockResolvedValue({
    response: { text: () => '{"memberId":"m1","reason":"Boa escolha"}' },
  })
})

afterEach(() => {
  delete process.env.GEMINI_API_KEY
})

// ===== client-update =====
describe('POST /api/ai/client-update', () => {
  const validBody = { eventId: VALID_EVENT_ID, focus: 'Update geral de progresso' }

  it('returns 401 when no user', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ user: null }) as never)
    const { POST } = await import('@/app/api/ai/client-update/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(401)
  })

  it('returns 403 when not a team member', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ member: null }) as never)
    const { POST } = await import('@/app/api/ai/client-update/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid body (bad uuid)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ member: defaultMember }) as never)
    const { POST } = await import('@/app/api/ai/client-update/route')
    const res = await POST(makeNextRequest({ eventId: 'not-a-uuid', focus: 'Update geral de progresso' }) as never)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid focus value', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ member: defaultMember }) as never)
    const { POST } = await import('@/app/api/ai/client-update/route')
    const res = await POST(makeNextRequest({ eventId: VALID_EVENT_ID, focus: 'Invalid focus' }) as never)
    expect(res.status).toBe(400)
  })

  it('returns 429 when rate limited', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ member: defaultMember }) as never)
    vi.mocked(isAiRateLimited).mockResolvedValueOnce(true)
    const { POST } = await import('@/app/api/ai/client-update/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(429)
  })

  it('returns 503 when GEMINI_API_KEY missing', async () => {
    delete process.env.GEMINI_API_KEY
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ member: defaultMember }) as never)
    const { POST } = await import('@/app/api/ai/client-update/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(503)
  })

  it('returns 404 when event not found', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ member: defaultMember, eventData: null }) as never,
    )
    const { POST } = await import('@/app/api/ai/client-update/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(404)
  })

  it('returns 200 streaming response for happy path', async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'team_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: defaultMember }),
          }
        }
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: defaultEvent }),
          }
        }
        // event_checklist_items — route fetches without .single()
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null }),
          then: (resolve: (v: unknown) => void) =>
            Promise.resolve({ data: [] }).then(resolve),
        }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    const { POST } = await import('@/app/api/ai/client-update/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/event-stream')
  })
})

// ===== describe-task =====
describe('POST /api/ai/describe-task', () => {
  const validBody = { taskId: VALID_TASK_ID, eventId: VALID_EVENT_ID }

  it('returns 401 when no user', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ user: null }) as never)
    const { POST } = await import('@/app/api/ai/describe-task/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(401)
  })

  it('returns 403 when not a team member', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ member: null }) as never)
    const { POST } = await import('@/app/api/ai/describe-task/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid body (bad uuid)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ member: defaultMember }) as never)
    const { POST } = await import('@/app/api/ai/describe-task/route')
    const res = await POST(makeNextRequest({ taskId: 'not-uuid', eventId: VALID_EVENT_ID }) as never)
    expect(res.status).toBe(400)
  })

  it('returns 429 when rate limited', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ member: defaultMember }) as never)
    vi.mocked(isAiRateLimited).mockResolvedValueOnce(true)
    const { POST } = await import('@/app/api/ai/describe-task/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(429)
  })

  it('returns 503 when GEMINI_API_KEY missing', async () => {
    delete process.env.GEMINI_API_KEY
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ member: defaultMember }) as never)
    const { POST } = await import('@/app/api/ai/describe-task/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(503)
  })

  it('returns 404 when task not found', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ member: defaultMember, taskData: null }) as never,
    )
    const { POST } = await import('@/app/api/ai/describe-task/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(404)
  })

  it('returns 403 when event not owned by org', async () => {
    // task found, but event returns null => 403
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'team_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: defaultMember }),
          }
        }
        if (table === 'event_tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: defaultTask }),
          }
        }
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null }),
        }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    const { POST } = await import('@/app/api/ai/describe-task/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(403)
  })

  it('returns 200 streaming response for happy path', async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'team_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: defaultMember }),
          }
        }
        if (table === 'event_tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            // task has no parent_id so no second event_tasks call
            single: vi.fn().mockResolvedValue({ data: defaultTask }),
          }
        }
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: defaultEvent }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null }),
        }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    const { POST } = await import('@/app/api/ai/describe-task/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/event-stream')
  })
})

// ===== event-summary =====
describe('POST /api/ai/event-summary', () => {
  const validBody = { eventId: VALID_EVENT_ID }

  it('returns 401 when no user', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ user: null }) as never)
    const { POST } = await import('@/app/api/ai/event-summary/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(401)
  })

  it('returns 403 when not a team member', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ member: null }) as never)
    const { POST } = await import('@/app/api/ai/event-summary/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid body', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ member: defaultMember }) as never)
    const { POST } = await import('@/app/api/ai/event-summary/route')
    const res = await POST(makeNextRequest({ eventId: 'bad-not-uuid' }) as never)
    expect(res.status).toBe(400)
  })

  it('returns 429 when rate limited', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ member: defaultMember }) as never)
    vi.mocked(isAiRateLimited).mockResolvedValueOnce(true)
    const { POST } = await import('@/app/api/ai/event-summary/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(429)
  })

  it('returns 503 when GEMINI_API_KEY missing', async () => {
    delete process.env.GEMINI_API_KEY
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ member: defaultMember }) as never)
    const { POST } = await import('@/app/api/ai/event-summary/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(503)
  })

  it('returns 404 when event not found', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ member: defaultMember, eventData: null }) as never,
    )
    const { POST } = await import('@/app/api/ai/event-summary/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(404)
  })

  it('returns 200 streaming response for happy path', async () => {
    // After event fetch, the route calls Promise.all with 3 queries on:
    //   event_checklist_items, event_tasks, event_notes
    // All return arrays (no .single()) — we make them thenable
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'team_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: defaultMember }),
          }
        }
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: defaultEvent }),
          }
        }
        // event_checklist_items, event_tasks: awaited as array queries
        if (table === 'event_tasks' || table === 'event_checklist_items') {
          const chain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve: (v: unknown) => void) =>
              Promise.resolve({ data: [] }).then(resolve),
          }
          return chain
        }
        // event_notes: uses .order().limit()
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [] }),
        }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    const { POST } = await import('@/app/api/ai/event-summary/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/event-stream')
  })
})

// ===== generate-tasks =====
describe('POST /api/ai/generate-tasks', () => {
  const validBody = {
    eventId: VALID_EVENT_ID,
    eventType: 'Wedding',
    guestCount: 100,
    eventDate: '2026-06-15',
  }

  it('returns 401 when no user', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ user: null }) as never)
    const { POST } = await import('@/app/api/ai/generate-tasks/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(401)
  })

  it('returns 403 when not a team member', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ member: null }) as never)
    const { POST } = await import('@/app/api/ai/generate-tasks/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(403)
  })

  it('returns 400 for missing required fields', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ member: defaultMember }) as never)
    const { POST } = await import('@/app/api/ai/generate-tasks/route')
    // missing eventType, guestCount, eventDate
    const res = await POST(makeNextRequest({ eventId: VALID_EVENT_ID }) as never)
    expect(res.status).toBe(400)
  })

  it('returns 429 when rate limited', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ member: defaultMember }) as never)
    vi.mocked(isAiRateLimited).mockResolvedValueOnce(true)
    const { POST } = await import('@/app/api/ai/generate-tasks/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(429)
  })

  it('returns 404 when event not found (checked before API key)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ member: defaultMember, eventData: null }) as never,
    )
    const { POST } = await import('@/app/api/ai/generate-tasks/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(404)
  })

  it('returns 503 when GEMINI_API_KEY missing (checked after event fetch)', async () => {
    delete process.env.GEMINI_API_KEY
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ member: defaultMember, eventData: defaultEvent }) as never,
    )
    const { POST } = await import('@/app/api/ai/generate-tasks/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(503)
  })

  it('returns 200 streaming response for happy path', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ member: defaultMember, eventData: defaultEvent }) as never,
    )
    const { POST } = await import('@/app/api/ai/generate-tasks/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/event-stream')
  })
})

// ===== risk-analysis =====
describe('POST /api/ai/risk-analysis', () => {
  const validBody = { eventId: VALID_EVENT_ID }

  it('returns 401 when no user', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ user: null }) as never)
    const { POST } = await import('@/app/api/ai/risk-analysis/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(401)
  })

  it('returns 403 when not a team member', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ member: null }) as never)
    const { POST } = await import('@/app/api/ai/risk-analysis/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid body (bad uuid)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ member: defaultMember }) as never)
    const { POST } = await import('@/app/api/ai/risk-analysis/route')
    const res = await POST(makeNextRequest({ eventId: 'bad-not-uuid' }) as never)
    expect(res.status).toBe(400)
  })

  it('returns 429 when rate limited', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ member: defaultMember }) as never)
    vi.mocked(isAiRateLimited).mockResolvedValueOnce(true)
    const { POST } = await import('@/app/api/ai/risk-analysis/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(429)
  })

  it('returns 503 when GEMINI_API_KEY missing', async () => {
    delete process.env.GEMINI_API_KEY
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ member: defaultMember }) as never)
    const { POST } = await import('@/app/api/ai/risk-analysis/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(503)
  })

  it('returns 404 when event not found', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ member: defaultMember, eventData: null }) as never,
    )
    const { POST } = await import('@/app/api/ai/risk-analysis/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(404)
  })

  it('returns 200 streaming response for happy path', async () => {
    // After event fetch, the route calls Promise.all with 4 queries:
    //   event_tasks (array), event_checklist_items (array),
    //   event_team_assignments (count, head), event_notes (count, head)
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'team_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: defaultMember }),
          }
        }
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: defaultEvent }),
          }
        }
        // event_tasks and event_checklist_items: awaited as arrays
        if (table === 'event_tasks' || table === 'event_checklist_items') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve: (v: unknown) => void) =>
              Promise.resolve({ data: [] }).then(resolve),
          }
        }
        // event_team_assignments and event_notes: select(..., {count, head}).eq() → awaits to { count: 0 }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: (resolve: (v: unknown) => void) =>
            Promise.resolve({ count: 0 }).then(resolve),
        }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    const { POST } = await import('@/app/api/ai/risk-analysis/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/event-stream')
  })
})

// ===== suggest-assignee =====
describe('POST /api/ai/suggest-assignee', () => {
  const validBody = { taskId: VALID_TASK_ID, eventId: VALID_EVENT_ID }
  const twoMembers = [
    { id: 'm1', full_name: 'Alice', role: 'admin' },
    { id: 'm2', full_name: 'Bob', role: 'member' },
  ]

  it('returns 401 when no user', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ user: null }) as never)
    const { POST } = await import('@/app/api/ai/suggest-assignee/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(401)
  })

  it('returns 403 when not a team member', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ member: null }) as never)
    const { POST } = await import('@/app/api/ai/suggest-assignee/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid body (bad uuid)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ member: defaultMember }) as never)
    const { POST } = await import('@/app/api/ai/suggest-assignee/route')
    const res = await POST(makeNextRequest({ taskId: 'bad', eventId: VALID_EVENT_ID }) as never)
    expect(res.status).toBe(400)
  })

  it('returns 429 when rate limited', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ member: defaultMember }) as never)
    vi.mocked(isAiRateLimited).mockResolvedValueOnce(true)
    const { POST } = await import('@/app/api/ai/suggest-assignee/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(429)
  })

  it('returns 503 when GEMINI_API_KEY missing', async () => {
    delete process.env.GEMINI_API_KEY
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ member: defaultMember }) as never)
    const { POST } = await import('@/app/api/ai/suggest-assignee/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(503)
  })

  it('returns 404 when task not found', async () => {
    // Route uses Promise.all([task, orgMembers, recentTasks]) then checks !task
    // We need the team_members .single() for auth guard AND the orgMembers array fetch.
    // We track call count on `from('team_members')` to differentiate.
    let teamMembersCallCount = 0
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'team_members') {
          teamMembersCallCount++
          if (teamMembersCallCount === 1) {
            // First call: guard clause .single()
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: defaultMember }),
            }
          }
          // Second call inside Promise.all: org members list (no .single())
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve: (v: unknown) => void) =>
              Promise.resolve({ data: twoMembers }).then(resolve),
          }
        }
        if (table === 'event_tasks') {
          // Both event_tasks queries in Promise.all: task .single() returns null, recentTasks .limit() returns []
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null }),
            not: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [] }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null }),
        }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    const { POST } = await import('@/app/api/ai/suggest-assignee/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(404)
  })

  it('returns null JSON when org has only 1 member', async () => {
    const oneMember = [{ id: 'm1', full_name: 'Alice', role: 'admin' }]
    let teamMembersCallCount = 0
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'team_members') {
          teamMembersCallCount++
          if (teamMembersCallCount === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: defaultMember }),
            }
          }
          // org members list: only 1
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve: (v: unknown) => void) =>
              Promise.resolve({ data: oneMember }).then(resolve),
          }
        }
        if (table === 'event_tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: defaultTask }),
            not: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [] }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null }),
        }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    const { POST } = await import('@/app/api/ai/suggest-assignee/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toBeNull()
  })

  it('returns parsed JSON result for happy path with 2+ members', async () => {
    let teamMembersCallCount = 0
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'team_members') {
          teamMembersCallCount++
          if (teamMembersCallCount === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: defaultMember }),
            }
          }
          // org members list: 2 members
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve: (v: unknown) => void) =>
              Promise.resolve({ data: twoMembers }).then(resolve),
          }
        }
        if (table === 'event_tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: defaultTask }),
            not: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [] }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null }),
        }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    // Ensure Gemini returns a valid memberId from our twoMembers list
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => '{"memberId":"m1","reason":"Boa escolha"}' },
    })
    const { POST } = await import('@/app/api/ai/suggest-assignee/route')
    const res = await POST(makeNextRequest(validBody) as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).not.toBeNull()
    expect(body).toMatchObject({ memberId: 'm1', memberName: 'Alice' })
  })
})
