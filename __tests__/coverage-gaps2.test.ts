/**
 * Second coverage gap file targeting remaining branch gaps after coverage-gaps.test.ts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── dispatcher: draft-not-found + qstash error catch + filterClientsByAudience default ──
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))
vi.mock('@/lib/notifications/channels/email', () => ({
  sendEmail: vi.fn().mockResolvedValue('msg-id'),
  buildEmailHtml: () => '<html></html>',
}))
vi.mock('@/lib/event-status', () => ({
  calcProgress: vi.fn().mockReturnValue(50),
}))

describe('dispatcher additional branches', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_PORTAL_URL = 'http://localhost:3000'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    vi.resetModules()
  })

  function makeQuery(resolved: unknown) {
    const q: Record<string, unknown> = {}
    q.then = (res: (v: unknown) => void, rej: (e: unknown) => void) => Promise.resolve(resolved).then(res, rej)
    q.catch = (rej: (e: unknown) => void) => Promise.resolve(resolved).catch(rej)
    const chain = () => makeQuery(resolved)
    q.select = vi.fn(chain); q.insert = vi.fn(chain); q.update = vi.fn(chain)
    q.eq = vi.fn(chain); q.in = vi.fn(chain); q.is = vi.fn(chain)
    q.lte = vi.fn(chain); q.limit = vi.fn(chain)
    q.maybeSingle = vi.fn(chain); q.single = vi.fn(chain)
    return q
  }

  const mockEventClient = {
    id: 'ec-1', event_id: 'event-1', client_id: 'client-1', role: 'primary_contact', opted_out: false,
    notification_prefs: { channels: ['email'], language: 'pt' },
    client: { id: 'client-1', organization_id: 'org-1', full_name: 'Ana', email: 'ana@x.pt', phone: null, whatsapp: null, company: null, notes: null, is_active: true, created_at: '', updated_at: '' },
  }
  const mockTemplate = { id: 'tpl-1', organization_id: 'org-1', name: 'T', channel: 'email', language: 'pt', subject: 'S', body_template: 'B', is_active: true, created_at: '', updated_at: '' }

  const makeEvent = () => ({
    id: 'event-1', organization_id: 'org-1', name: 'Concert', slug: 'c', status: 'active',
    start_datetime: '2026-06-01T20:00:00Z', end_datetime: null, venue_name: null,
    venue_address: null, description: null, portal_token: 'tok',
    portal_token_expires_at: null, event_type_id: 'type-1',
    settings: {}, created_by: null, created_at: '', updated_at: '',
  })

  const makeItem = (audience = 'all_clients') => ({
    id: 'item-1', event_id: 'event-1', template_item_id: null, parent_item_id: null,
    title: 'Stage', client_label: 'Stage', description: null, position: 1,
    is_client_visible: true, status: 'completed', completed_at: null, completed_by: null,
    started_at: null, completion_note: null, assigned_to: null, due_at: null,
    notification_rules: [{ trigger: 'on_complete', delay_minutes: 0, audience, channels: ['email'], language: 'pt' }],
    created_at: '', updated_at: '',
  })

  it('draft-not-found: marks job failed when insertedJob key does not match any draft', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const mockUpdate = vi.fn()

    // The inserted job has a different client_id than the draft → key mismatch
    const insertedJobMismatch = { id: 'job-99', event_id: 'event-1', checklist_item_id: 'item-1', client_id: 'WRONG-client', channel: 'email' }
    const tableData: Record<string, unknown> = {
      event_clients: { data: [mockEventClient], error: null },
      event_checklist_items: { data: [{ id: 'item-1', status: 'completed' }], error: null },
      message_templates: { data: [mockTemplate], error: null },
      notification_jobs: { data: [insertedJobMismatch], error: null },
      notification_log: { data: null, error: null },
    }

    const supabaseMock = {
      from: vi.fn((table: string) => {
        const q = makeQuery(tableData[table] ?? { data: null, error: null })
        // Override update to track calls
        const origUpdate = q.update as ReturnType<typeof vi.fn>
        ;(q as Record<string, unknown>).update = vi.fn((...args: unknown[]) => { mockUpdate(...args); return makeQuery({ data: null, error: null }) })
        return q
      }),
    }
    vi.mocked(createAdminClient).mockReturnValue(supabaseMock as never)
    delete process.env.QSTASH_TOKEN

    const { dispatchNotificationsForItem } = await import('@/lib/notifications/dispatcher')
    await dispatchNotificationsForItem({ event: makeEvent() as never, item: makeItem() as never, completedByName: 'Rui' })

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', last_error: 'draft lookup failed after insert' })
    )
  })

  it('qstash path: marks job failed when publishJSON throws', async () => {
    process.env.QSTASH_TOKEN = 'tok'
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const mockUpdate = vi.fn()

    const insertedJob = { id: 'job-1', event_id: 'event-1', checklist_item_id: 'item-1', client_id: 'client-1', channel: 'email' }
    const tableData: Record<string, unknown> = {
      event_clients: { data: [mockEventClient], error: null },
      event_checklist_items: { data: [{ id: 'item-1', status: 'completed' }], error: null },
      message_templates: { data: [mockTemplate], error: null },
      notification_jobs: { data: [insertedJob], error: null },
      notification_log: { data: null, error: null },
    }

    const supabaseMock = {
      from: vi.fn((table: string) => {
        const q = makeQuery(tableData[table] ?? { data: null, error: null })
        ;(q as Record<string, unknown>).update = vi.fn((...args: unknown[]) => { mockUpdate(...args); return makeQuery({ data: null, error: null }) })
        return q
      }),
    }
    vi.mocked(createAdminClient).mockReturnValue(supabaseMock as never)

    // Mock @upstash/qstash Client so publishJSON throws
    vi.doMock('@upstash/qstash', () => ({
      Client: vi.fn().mockImplementation(function () {
        return { publishJSON: vi.fn().mockRejectedValue(new Error('QStash error')) }
      }),
    }))

    const { dispatchNotificationsForItem } = await import('@/lib/notifications/dispatcher')
    await dispatchNotificationsForItem({ event: makeEvent() as never, item: makeItem() as never, completedByName: 'Rui' })

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' })
    )
    delete process.env.QSTASH_TOKEN
  })

  it('filterClientsByAudience default case returns all clients', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const { sendEmail } = await import('@/lib/notifications/channels/email')
    const mockSendEmail = vi.mocked(sendEmail)

    const insertedJob = { id: 'job-1', event_id: 'event-1', checklist_item_id: 'item-1', client_id: 'client-1', channel: 'email' }
    const tableData: Record<string, unknown> = {
      event_clients: { data: [mockEventClient], error: null },
      event_checklist_items: { data: [{ id: 'item-1', status: 'completed' }], error: null },
      message_templates: { data: [mockTemplate], error: null },
      notification_jobs: { data: [insertedJob], error: null },
      notification_log: { data: null, error: null },
    }

    const supabaseMock = { from: vi.fn((table: string) => makeQuery(tableData[table] ?? { data: null, error: null })) }
    vi.mocked(createAdminClient).mockReturnValue(supabaseMock as never)
    delete process.env.QSTASH_TOKEN

    // Use an audience value that falls through to default (not a valid enum value)
    const itemWithDefaultAudience = makeItem('unknown_audience' as string)
    const { dispatchNotificationsForItem } = await import('@/lib/notifications/dispatcher')
    await dispatchNotificationsForItem({ event: makeEvent() as never, item: itemWithDefaultAudience as never, completedByName: 'Rui' })

    // Default returns all clients → email sent
    expect(mockSendEmail).toHaveBeenCalled()
  })

  it('insert fails: logs error and returns early when notification_jobs insert errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const { sendEmail } = await import('@/lib/notifications/channels/email')
    const mockSendEmail = vi.mocked(sendEmail)

    const tableData: Record<string, unknown> = {
      event_clients: { data: [mockEventClient], error: null },
      event_checklist_items: { data: [{ id: 'item-1', status: 'completed' }], error: null },
      message_templates: { data: [mockTemplate], error: null },
      // Insert fails with an error
      notification_jobs: { data: null, error: { message: 'Insert failed' } },
    }

    const supabaseMock = { from: vi.fn((table: string) => makeQuery(tableData[table] ?? { data: null, error: null })) }
    vi.mocked(createAdminClient).mockReturnValue(supabaseMock as never)
    delete process.env.QSTASH_TOKEN

    const { dispatchNotificationsForItem } = await import('@/lib/notifications/dispatcher')
    await dispatchNotificationsForItem({ event: makeEvent() as never, item: makeItem() as never, completedByName: 'Rui' })

    expect(mockSendEmail).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('falha ao inserir'), expect.anything())
    errorSpy.mockRestore()
  })
})

// ─── portal/data.ts: error log branches ──────────────────────────────────────
vi.mock('@/lib/portal/token', () => ({
  verifyPortalToken: vi.fn(),
}))
vi.mock('date-fns', () => ({
  format: vi.fn().mockReturnValue('segunda-feira, 15 de junho de 2026'),
}))
vi.mock('date-fns/locale', () => ({ pt: {} }))

describe('lib/portal/data getPortalData error log branches', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('logs error when itemFiles query fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { verifyPortalToken } = await import('@/lib/portal/token')
    vi.mocked(verifyPortalToken).mockResolvedValue({ eventId: 'evt-1' } as never)

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const mockEvent = { id: 'evt-1', name: 'Test', venue_name: null, start_datetime: '2026-06-15T20:00:00Z', status: 'active', settings: {} }
    const mockItems = [{ id: 'item-1', client_label: null, title: 'T', status: 'pending', completed_at: null, completion_note: null, position: 1, due_at: null }]

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'events') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: mockEvent }) }
        }
        if (table === 'event_checklist_items') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: mockItems }) }
        }
        if (table === 'checklist_item_files') {
          // Return error to trigger itemFilesError log
          return { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }) }
        }
        if (table === 'event_files') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [], error: null }) }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) }
      }),
    } as never)

    const { getPortalData } = await import('@/lib/portal/data')
    const result = await getPortalData('valid-token')
    expect(result).not.toBeNull()
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('itemFiles'), expect.any(Object))
    errorSpy.mockRestore()
  })

  it('logs error when eventFiles query fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { verifyPortalToken } = await import('@/lib/portal/token')
    vi.mocked(verifyPortalToken).mockResolvedValue({ eventId: 'evt-1' } as never)

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const mockEvent = { id: 'evt-1', name: 'Test', venue_name: null, start_datetime: '2026-06-15T20:00:00Z', status: 'active', settings: {} }

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'events') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: mockEvent }) }
        }
        if (table === 'event_checklist_items') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [] }) }
        }
        if (table === 'checklist_item_files') {
          // No items, so this won't be called (itemIds is empty)
          return { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [], error: null }) }
        }
        if (table === 'event_files') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: null, error: { message: 'EF error' } }) }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) }
      }),
    } as never)

    const { getPortalData } = await import('@/lib/portal/data')
    const result = await getPortalData('valid-token')
    expect(result).not.toBeNull()
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('eventFiles'), expect.any(Object))
    errorSpy.mockRestore()
  })

  it('handles event with null settings (falls back to {})', async () => {
    const { verifyPortalToken } = await import('@/lib/portal/token')
    vi.mocked(verifyPortalToken).mockResolvedValue({ eventId: 'evt-1' } as never)

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const mockEvent = { id: 'evt-1', name: 'Test', venue_name: null, start_datetime: '2026-06-15T20:00:00Z', status: 'active', settings: null }

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
    expect(result).not.toBeNull()
    expect(result!.heroVideo).toBeNull()
    expect(result!.contentVideo).toBeNull()
  })
})
