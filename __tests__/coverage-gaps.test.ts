/**
 * Coverage gap-fill tests for branches not reached by primary test files.
 * Groups: lib/portal/data, lib/notifications/channels/email, lib/csv-import,
 *         AI routes (overdue branches + stream error paths),
 *         cron route (claim error + hasMore warn), dispatcher qstash path
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── lib/portal/data getPortalData ───────────────────────────────────────────
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))
vi.mock('@/lib/event-status', () => ({
  calcProgress: vi.fn().mockReturnValue(50),
}))
vi.mock('date-fns', () => ({
  format: vi.fn().mockReturnValue('segunda-feira, 15 de junho de 2026'),
}))
vi.mock('date-fns/locale', () => ({ pt: {} }))

describe('lib/portal/data getPortalData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when token is invalid', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      }),
    } as never)

    const { getPortalData } = await import('@/lib/portal/data')
    const result = await getPortalData('bad-token')
    expect(result).toBeNull()
  })

  it('returns null when event not found', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      }),
    } as never)

    const { getPortalData } = await import('@/lib/portal/data')
    const result = await getPortalData('valid-token')
    expect(result).toBeNull()
  })

  it('returns full portal data for happy path', async () => {
    const mockEvent = {
      id: 'evt-1', name: 'Summer Gala', venue_name: 'Grand Hall',
      start_datetime: '2026-06-15T20:00:00Z', status: 'active',
      settings: {
        portal_hero_video: 'https://cdn.example.com/hero.mp4',
        portal_content_video: 'https://cdn.example.com/content.mp4',
      },
    }
    const mockItems = [
      { id: 'item-1', client_label: 'Catering', title: 'Catering setup', status: 'completed', completed_at: '2026-06-01T10:00:00Z', completion_note: null, position: 1, due_at: null },
      { id: 'item-2', client_label: null, title: 'Sound check', status: 'pending', completed_at: null, completion_note: null, position: 2, due_at: null },
    ]
    const mockItemFiles = [
      { checklist_item_id: 'item-1', event_file: { id: 'f1', file_name: 'contract.pdf', file_size: 100, mime_type: 'application/pdf', blob_url: 'https://x/f1' } },
    ]
    const mockEventFiles = [
      { id: 'f1', file_name: 'contract.pdf', file_size: 100, mime_type: 'application/pdf', blob_url: 'https://x/f1' },
      { id: 'f2', file_name: 'rider.pdf', file_size: 200, mime_type: 'application/pdf', blob_url: 'https://x/f2' },
    ]

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'events') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: mockEvent }) }
      }
      if (table === 'event_checklist_items') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: mockItems }) }
      }
      if (table === 'checklist_item_files') {
        return { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: mockItemFiles, error: null }) }
      }
      if (table === 'event_files') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: mockEventFiles, error: null }) }
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) }
    })
    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as never)

    const { getPortalData } = await import('@/lib/portal/data')
    const result = await getPortalData('valid-token')

    expect(result).not.toBeNull()
    expect(result!.event.name).toBe('Summer Gala')
    expect(result!.items).toHaveLength(2)
    expect(result!.heroVideo).toBe('https://cdn.example.com/hero.mp4')
    expect(result!.contentVideo).toBe('https://cdn.example.com/content.mp4')
    expect(result!.eventFiles.map(f => f.id)).not.toContain('f1')
    expect(result!.eventFiles.map(f => f.id)).toContain('f2')
  })

  it('normalizes settings — ignores relative path and empty videos', async () => {
    const mockEvent = {
      id: 'evt-1', name: 'Test', venue_name: null,
      start_datetime: '2026-06-15T20:00:00Z', status: 'active',
      settings: { portal_hero_video: '/local/path.mp4', portal_content_video: '' },
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'events') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: mockEvent }) }
        }
        if (table === 'event_checklist_items') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [] }) }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [], error: null }), order: vi.fn().mockResolvedValue({ data: [], error: null }) }
      }),
    } as never)

    const { getPortalData } = await import('@/lib/portal/data')
    const result = await getPortalData('valid-token')
    expect(result!.heroVideo).toBeNull()
    expect(result!.contentVideo).toBeNull()
  })
})

// ─── lib/notifications/channels/email buildEmailHtml ─────────────────────────
describe('buildEmailHtml', () => {
  it('renders with no eventName and no progress bar', async () => {
    const { buildEmailHtml } = await import('@/lib/notifications/channels/email')
    const html = buildEmailHtml('Hello world')
    expect(html).toContain('Hello world')
    expect(html).not.toContain('Progresso do evento')
  })

  it('renders URL lines as CTA buttons', async () => {
    const { buildEmailHtml } = await import('@/lib/notifications/channels/email')
    const html = buildEmailHtml('https://portal.example.com/event/abc', 'Test Event', 75)
    expect(html).toContain('href="https://portal.example.com/event/abc"')
    expect(html).toContain('Ver portal do evento')
    expect(html).toContain('75%')
  })

  it('renders bold markdown markers', async () => {
    const { buildEmailHtml } = await import('@/lib/notifications/channels/email')
    const html = buildEmailHtml('**Important** notice', 'Event', 0)
    expect(html).toContain('<strong>Important</strong>')
  })

  it('strips unsafe href schemes (javascript:// becomes null, no button rendered)', async () => {
    const { buildEmailHtml } = await import('@/lib/notifications/channels/email')
    const html = buildEmailHtml('javascript://x.com/alert', 'Event')
    expect(html).not.toContain('href="javascript:')
  })

  it('renders eventName in header when provided', async () => {
    const { buildEmailHtml } = await import('@/lib/notifications/channels/email')
    const html = buildEmailHtml('body text', 'My Concert')
    expect(html).toContain('My Concert')
  })

  it('filters out blank lines (returns null for empty trim)', async () => {
    const { buildEmailHtml } = await import('@/lib/notifications/channels/email')
    const html = buildEmailHtml('Line one\n\nLine two')
    expect(html).toContain('Line one')
    expect(html).toContain('Line two')
  })
})

// ─── lib/csv-import missing branches ─────────────────────────────────────────
describe('parseCsvClients edge cases', () => {
  it('returns globalError when CSV exceeds 200KB', async () => {
    const { parseCsvClients } = await import('@/lib/csv-import')
    const big = 'a'.repeat(200_001)
    const result = parseCsvClients(big)
    expect(result.globalError).toMatch(/200/)
    expect(result.rows).toHaveLength(0)
  })

  it('returns globalError when CSV has fewer than 2 lines', async () => {
    const { parseCsvClients } = await import('@/lib/csv-import')
    const result = parseCsvClients('nome,email')
    expect(result.globalError).toMatch(/sem dados/i)
  })

  it('marks name > 200 chars as error', async () => {
    const { parseCsvClients } = await import('@/lib/csv-import')
    const longName = 'a'.repeat(201)
    const csv = `nome,email\n${longName},joao@x.pt`
    const result = parseCsvClients(csv)
    expect(result.rows[0].error).toMatch(/longo/i)
  })

  it('marks email > 254 chars as error', async () => {
    const { parseCsvClients } = await import('@/lib/csv-import')
    const longEmail = `${'a'.repeat(250)}@x.pt`
    const csv = `nome,email\nJoão,${longEmail}`
    const result = parseCsvClients(csv)
    expect(result.rows[0].error).toMatch(/longo/i)
  })
})

// ─── AI route stream error paths + overdue branches ──────────────────────────
const mockGenerateContentStream = vi.fn()
const mockGenerateContent = vi.fn()
const mockGeminiInstance = { getGenerativeModel: vi.fn() }

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(function () { return mockGeminiInstance }),
}))
vi.mock('@/lib/ai-rate-limit', () => ({
  isAiRateLimited: vi.fn().mockResolvedValue(false),
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'

const VALID_EVENT_ID = 'a1b2c3d4-e5f6-4789-8abc-def012345678'
const VALID_TASK_ID  = 'd4c3b2a1-f6e5-4987-abcd-678901234567'

function makeReq(body: unknown) {
  return { json: () => Promise.resolve(body) } as unknown as Request
}

function makeBaseSupabase(eventData: unknown = null) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'team_members') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'm1', organization_id: 'org-1' } }) }
      }
      if (table === 'events') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: eventData }) }
      }
      return {
        select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }),
        then: (resolve: (v: unknown) => void) => Promise.resolve({ data: [], count: 0 }).then(resolve),
        order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [], count: 0 }),
      }
    }),
  }
}

const defaultEvent = {
  id: VALID_EVENT_ID, name: 'Gala', start_datetime: '2026-06-15T20:00:00Z',
  status: 'active', venue_name: null,
}

async function readStream(res: Response): Promise<string> {
  const reader = res.body!.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  return new TextDecoder().decode(Buffer.concat(chunks))
}

describe('AI route stream error catch branches', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'key'
    vi.clearAllMocks()
    mockGeminiInstance.getGenerativeModel.mockReturnValue({
      generateContentStream: mockGenerateContentStream,
      generateContent: mockGenerateContent,
    })
    mockGenerateContentStream.mockImplementation(() => Promise.resolve({
      stream: (async function* () { yield { text: () => 'Hello' } })(),
    }))
    mockGenerateContent.mockResolvedValue({
      response: { text: () => '{"memberId":"m1","reason":"Good"}' },
    })
  })
  afterEach(() => { delete process.env.GEMINI_API_KEY })

  it('client-update: stream error is caught, fallback text enqueued', async () => {
    vi.mocked(createClient).mockResolvedValue(makeBaseSupabase(defaultEvent) as never)
    mockGenerateContentStream.mockImplementationOnce(() => Promise.resolve({ stream: (async function* () { throw new Error('Stream interrupted') })() }))

    const { POST } = await import('@/app/api/ai/client-update/route')
    const res = await POST(makeReq({ eventId: VALID_EVENT_ID, focus: 'Update geral de progresso' }) as never)
    expect(res.status).toBe(200)
    const text = await readStream(res)
    expect(text).toContain('Erro ao gerar mensagem')
  })

  it('describe-task: covers parent_id branch (fetches parent title)', async () => {
    const taskWithParent = {
      id: VALID_TASK_ID, title: 'Child task', description: null,
      parent_id: 'parent-task-id', event_id: VALID_EVENT_ID,
    }
    let eventTasksCallCount = 0
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'team_members') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'm1', organization_id: 'org-1' } }) }
        }
        if (table === 'event_tasks') {
          eventTasksCallCount++
          // First call: the task itself; second call: parent title fetch
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({
            data: eventTasksCallCount === 1 ? taskWithParent : { title: 'Parent task title' },
          })}
        }
        if (table === 'events') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: defaultEvent }) }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const { POST } = await import('@/app/api/ai/describe-task/route')
    const res = await POST(makeReq({ taskId: VALID_TASK_ID, eventId: VALID_EVENT_ID }) as never)
    expect(res.status).toBe(200)
  })

  it('describe-task: stream error is caught', async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'team_members') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'm1', organization_id: 'org-1' } }) }
        }
        if (table === 'event_tasks') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: VALID_TASK_ID, title: 'Test', description: null, parent_id: null, event_id: VALID_EVENT_ID } }) }
        }
        if (table === 'events') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: defaultEvent }) }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    mockGenerateContentStream.mockImplementationOnce(() => Promise.resolve({ stream: (async function* () { throw new Error('Stream interrupted') })() }))

    const { POST } = await import('@/app/api/ai/describe-task/route')
    const res = await POST(makeReq({ taskId: VALID_TASK_ID, eventId: VALID_EVENT_ID }) as never)
    expect(res.status).toBe(200)
    const text = await readStream(res)
    expect(text).toContain('---SUBTASKS---')
  })

  it('event-summary: covers overdue checklist/tasks and notes block', async () => {
    const pastDate = '2026-01-01T00:00:00Z'
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'team_members') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'm1', organization_id: 'org-1' } }) }
        }
        if (table === 'events') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: defaultEvent }) }
        }
        if (table === 'event_checklist_items') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
            then: (resolve: (v: unknown) => void) => Promise.resolve({ data: [{ status: 'pending', due_at: pastDate }] }).then(resolve),
          }
        }
        if (table === 'event_tasks') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
            then: (resolve: (v: unknown) => void) => Promise.resolve({ data: [{ status: 'in_progress', due_at: pastDate, assigned_to: null }] }).then(resolve),
          }
        }
        if (table === 'event_notes') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [{ content: 'Note 1', created_at: pastDate }] }),
          }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), then: (resolve: (v: unknown) => void) => Promise.resolve({ data: [] }).then(resolve) }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const { POST } = await import('@/app/api/ai/event-summary/route')
    const res = await POST(makeReq({ eventId: VALID_EVENT_ID }) as never)
    expect(res.status).toBe(200)
  })

  it('event-summary: stream error is caught', async () => {
    vi.mocked(createClient).mockResolvedValue(makeBaseSupabase(defaultEvent) as never)
    mockGenerateContentStream.mockImplementationOnce(() => Promise.resolve({ stream: (async function* () { throw new Error('Stream interrupted') })() }))

    const { POST } = await import('@/app/api/ai/event-summary/route')
    const res = await POST(makeReq({ eventId: VALID_EVENT_ID }) as never)
    expect(res.status).toBe(200)
    const text = await readStream(res)
    expect(text).toContain('Erro ao gerar resumo')
  })

  it('risk-analysis: covers overdue tasks/checklist + stream error', async () => {
    const pastDate = '2026-01-01T00:00:00Z'
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'team_members') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'm1', organization_id: 'org-1' } }) }
        }
        if (table === 'events') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: defaultEvent }) }
        }
        if (table === 'event_tasks') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
            then: (resolve: (v: unknown) => void) => Promise.resolve({ data: [
              { status: 'pending', due_at: pastDate, assigned_to: null },
              { status: 'completed', due_at: pastDate, assigned_to: 'm1' },
            ]}).then(resolve),
          }
        }
        if (table === 'event_checklist_items') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
            then: (resolve: (v: unknown) => void) => Promise.resolve({ data: [{ status: 'pending', due_at: pastDate }] }).then(resolve),
          }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
          then: (resolve: (v: unknown) => void) => Promise.resolve({ count: 2 }).then(resolve),
        }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    mockGenerateContentStream.mockImplementationOnce(() => Promise.resolve({ stream: (async function* () { throw new Error('Stream interrupted') })() }))

    const { POST } = await import('@/app/api/ai/risk-analysis/route')
    const res = await POST(makeReq({ eventId: VALID_EVENT_ID }) as never)
    expect(res.status).toBe(200)
    const text = await readStream(res)
    expect(text).toContain('LEVEL: yellow')
  })

  it('suggest-assignee: JSON parse error returns null', async () => {
    const twoMembers = [
      { id: 'm1', full_name: 'Alice', role: 'admin' },
      { id: 'm2', full_name: 'Bob', role: 'member' },
    ]
    const defaultTask = { id: VALID_TASK_ID, title: 'Setup', description: null, parent_id: null, event_id: VALID_EVENT_ID }
    let teamCallCount = 0
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'team_members') {
          teamCallCount++
          if (teamCallCount === 1) {
            return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'm1', organization_id: 'org-1' } }) }
          }
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), then: (resolve: (v: unknown) => void) => Promise.resolve({ data: twoMembers }).then(resolve) }
        }
        if (table === 'event_tasks') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: defaultTask }), not: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [] }) }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => 'NOT VALID JSON' },
    })

    const { POST } = await import('@/app/api/ai/suggest-assignee/route')
    const res = await POST(makeReq({ taskId: VALID_TASK_ID, eventId: VALID_EVENT_ID }) as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toBeNull()
  })

  it('suggest-assignee: recentTask history filtered by memberMap membership', async () => {
    const twoMembers = [
      { id: 'm1', full_name: 'Alice', role: 'admin' },
      { id: 'm2', full_name: 'Bob', role: 'member' },
    ]
    const defaultTask = { id: VALID_TASK_ID, title: 'Setup', description: 'Desc', parent_id: null, event_id: VALID_EVENT_ID }
    let teamCallCount = 0
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'team_members') {
          teamCallCount++
          if (teamCallCount === 1) {
            return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'm1', organization_id: 'org-1' } }) }
          }
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), then: (resolve: (v: unknown) => void) => Promise.resolve({ data: twoMembers }).then(resolve) }
        }
        if (table === 'event_tasks') {
          return {
            select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: defaultTask }),
            not: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [
              { title: 'Sound setup', assigned_to: 'm1' },       // in memberMap → included in historyLines
              { title: 'Unknown', assigned_to: 'unknown-id' },   // NOT in memberMap → filtered out
            ]}),
          }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => '{"memberId":"m1","reason":"Good match"}' },
    })

    const { POST } = await import('@/app/api/ai/suggest-assignee/route')
    const res = await POST(makeReq({ taskId: VALID_TASK_ID, eventId: VALID_EVENT_ID }) as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ memberId: 'm1' })
  })

  it('generate-tasks: stream error is caught', async () => {
    vi.mocked(createClient).mockResolvedValue(makeBaseSupabase(defaultEvent) as never)
    mockGenerateContentStream.mockImplementationOnce(() => Promise.resolve({ stream: (async function* () { throw new Error('Stream interrupted') })() }))

    const { POST } = await import('@/app/api/ai/generate-tasks/route')
    const res = await POST(makeReq({
      eventId: VALID_EVENT_ID,
      eventType: 'Wedding',
      guestCount: 100,
      eventDate: '2026-06-15',
    }) as never)
    expect(res.status).toBe(200)
    const text = await readStream(res)
    expect(text).toContain('error')
  })

  it('client-update: overdue items with status skipped are excluded from overdue count', async () => {
    // Covers the branch `i.status !== 'skipped'` where status IS 'skipped' → not counted as overdue
    const pastDate = '2026-01-01T00:00:00Z'
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'team_members') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'm1', organization_id: 'org-1' } }) }
        }
        if (table === 'events') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: defaultEvent }) }
        }
        // event_checklist_items: past due_at but status is 'skipped' → should NOT count as overdue
        return {
          select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
          then: (resolve: (v: unknown) => void) => Promise.resolve({ data: [
            { status: 'skipped', due_at: pastDate },
            { status: 'completed', due_at: pastDate },
          ]}).then(resolve),
        }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const { POST } = await import('@/app/api/ai/client-update/route')
    const res = await POST(makeReq({ eventId: VALID_EVENT_ID, focus: 'Update geral de progresso' }) as never)
    expect(res.status).toBe(200)
  })
})

// ─── cron/process-scheduled additional branches ──────────────────────────────
vi.mock('@upstash/qstash', () => {
  function Client(this: { publishJSON: ReturnType<typeof vi.fn> }) {
    this.publishJSON = vi.fn().mockResolvedValue({ messageId: 'qs-msg-1' })
  }
  return { Client }
})
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) =>
      ({ status: init?.status ?? 200, body: data, json: async () => data }),
  },
}))

describe('cron/process-scheduled additional branches', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'secret123-for-coverage-tests-32chars!!'
    process.env.QSTASH_TOKEN = 'qstash-token'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.quic.pt'
    vi.clearAllMocks()
  })
  afterEach(() => {
    delete process.env.CRON_SECRET
    delete process.env.QSTASH_TOKEN
    delete process.env.NEXT_PUBLIC_APP_URL
  })

  function makeRequest(authHeader: string | null = 'Bearer secret123-for-coverage-tests-32chars!!') {
    return { headers: { get: (h: string) => h === 'authorization' ? authHeader : null } }
  }

  it('returns 500 when claim update errors', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    let callCount = 0
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) {
            return Promise.resolve({ data: [{ id: 'j1', event_id: 'e1', client_id: 'c1', channel: 'email', rendered_subject: 'Hi', rendered_body: 'Body', qstash_message_id: null }], error: null })
          }
          return Promise.resolve({ data: null, error: null })
        }),
        then: (resolve: (v: unknown) => void) => Promise.resolve({ error: { message: 'DB error' } }).then(resolve),
      }),
    } as never)

    const { GET } = await import('@/app/api/cron/process-scheduled/route')
    const res = await GET(makeRequest() as never)
    expect(res.status).toBe(500)
  })

  it('logs warning and sets hasMore:true when 51+ jobs pending', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { createAdminClient } = await import('@/lib/supabase/admin')

    const jobs51 = Array.from({ length: 51 }, (_, i) => ({
      id: `j${i}`, event_id: 'e1', client_id: 'c1', channel: 'email',
      rendered_subject: 'Hi', rendered_body: 'Body', qstash_message_id: null,
    }))

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: jobs51, error: null }),
        then: (resolve: (v: unknown) => void) => {
          if (table === 'notification_jobs') return Promise.resolve({ error: null }).then(resolve)
          return Promise.resolve({ data: [] }).then(resolve)
        },
      })),
    } as never)

    const { GET } = await import('@/app/api/cron/process-scheduled/route')
    const res = await GET(makeRequest() as never)
    expect(res.body).toMatchObject({ hasMore: true })
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('50'))
    warnSpy.mockRestore()
  })
})

// ─── dispatcher: qstash code path ────────────────────────────────────────────
describe('dispatcher with QStash token set', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    process.env.QSTASH_TOKEN = 'tok'
    process.env.NEXT_PUBLIC_PORTAL_URL = 'http://localhost:3000'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    process.env.CRON_SECRET = 'dispatcher-cron-secret-32-chars-pad!!'
    vi.resetModules()
  })
  afterEach(() => {
    delete process.env.QSTASH_TOKEN
    delete process.env.CRON_SECRET
  })

  it('uses QStash publishJSON when QSTASH_TOKEN is set', async () => {
    const mockInsert = vi.fn()
    const mockUpdate = vi.fn()
    const tableData: Record<string, unknown> = {}

    function makeQuery(resolved: unknown) {
      const q: Record<string, unknown> = {}
      q.then = (res: (v: unknown) => void, rej: (e: unknown) => void) => Promise.resolve(resolved).then(res, rej)
      q.catch = (rej: (e: unknown) => void) => Promise.resolve(resolved).catch(rej)
      const chain = () => makeQuery(resolved)
      q.select = vi.fn(chain)
      q.insert = vi.fn((...args: unknown[]) => { mockInsert(...args); return makeQuery(resolved) })
      q.update = vi.fn((...args: unknown[]) => { mockUpdate(...args); return makeQuery(resolved) })
      q.eq = vi.fn(chain); q.in = vi.fn(chain); q.is = vi.fn(chain)
      q.lte = vi.fn(chain); q.limit = vi.fn(chain)
      q.maybeSingle = vi.fn(chain); q.single = vi.fn(chain)
      return q
    }

    const supabaseMock = { from: vi.fn((table: string) => makeQuery(tableData[table as keyof typeof tableData] ?? { data: null, error: null })) }
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: () => supabaseMock }))
    vi.doMock('@/lib/notifications/channels/email', () => ({
      sendEmail: vi.fn(), buildEmailHtml: () => '<html></html>',
    }))

    const mockEventClient = {
      id: 'ec-1', event_id: 'event-1', client_id: 'client-1', role: 'primary_contact', opted_out: false,
      notification_prefs: { channels: ['email'], language: 'pt' },
      client: { id: 'client-1', organization_id: 'org-1', full_name: 'Ana', email: 'ana@x.pt', phone: null, whatsapp: null, company: null, notes: null, is_active: true, created_at: '', updated_at: '' },
    }
    const mockTemplate = { id: 'tpl-1', organization_id: 'org-1', name: 'T', channel: 'email', language: 'pt', subject: 'Subj', body_template: 'Body', is_active: true, created_at: '', updated_at: '' }
    const insertedJob = { id: 'job-1', event_id: 'event-1', checklist_item_id: 'item-1', client_id: 'client-1', channel: 'email' }

    Object.assign(tableData, {
      event_clients: { data: [mockEventClient], error: null },
      event_checklist_items: { data: [{ id: 'item-1', status: 'completed' }], error: null },
      message_templates: { data: [mockTemplate], error: null },
      notification_jobs: { data: [insertedJob], error: null },
      notification_log: { data: null, error: null },
    })

    const makeEvent = () => ({
      id: 'event-1', organization_id: 'org-1', name: 'Concert', slug: 'c', status: 'active',
      start_datetime: '2026-06-01T20:00:00Z', end_datetime: null, venue_name: null,
      venue_address: null, description: null, portal_token: 'tok',
      portal_token_expires_at: null, event_type_id: 'type-1',
      settings: {}, created_by: null, created_at: '', updated_at: '',
    })
    const makeItem = () => ({
      id: 'item-1', event_id: 'event-1', template_item_id: null, parent_item_id: null,
      title: 'Stage', client_label: 'Stage', description: null, position: 1,
      is_client_visible: true, status: 'completed', completed_at: null, completed_by: null,
      started_at: null, completion_note: null, assigned_to: null, due_at: null,
      notification_rules: [{ trigger: 'on_complete', delay_minutes: 0, audience: 'all_clients', channels: ['email'], language: 'pt' }],
      created_at: '', updated_at: '',
    })

    const { dispatchNotificationsForItem } = await import('@/lib/notifications/dispatcher')
    await dispatchNotificationsForItem({ event: makeEvent() as never, item: makeItem() as never, completedByName: 'Rui' })

    expect(mockInsert).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalled()
  })
})
