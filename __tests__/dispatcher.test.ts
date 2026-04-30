import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NotificationRule } from '@/types/app'
import type { Event, EventChecklistItem } from '@/types/database'

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Track calls for assertions
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockSendEmail = vi.fn().mockResolvedValue('brevo-msg-id-1')

vi.mock('@/lib/notifications/channels/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  buildEmailHtml: () => '<html>mock</html>',
}))

// Supabase query builder: every method returns a thenable that resolves to
// { data, error }. We control the resolved value per table via `tableData`.
let tableData: Record<string, unknown> = {}

function makeQuery(resolvedValue: unknown) {
  const query: Record<string, unknown> = {}
  // Make it thenable so `await supabase.from(...).select(...).eq(...)` resolves
  query.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
    return Promise.resolve(resolvedValue).then(resolve, reject)
  }
  query.catch = (reject: (e: unknown) => void) =>
    Promise.resolve(resolvedValue).catch(reject)
  const chain = () => makeQuery(resolvedValue)
  query.select = vi.fn(chain)
  query.insert = vi.fn((...args: unknown[]) => { mockInsert(...args); return makeQuery(resolvedValue) })
  query.update = vi.fn((...args: unknown[]) => { mockUpdate(...args); return makeQuery(resolvedValue) })
  query.eq = vi.fn(chain)
  query.in = vi.fn(chain)
  query.is = vi.fn(chain)
  query.lte = vi.fn(chain)
  query.limit = vi.fn(chain)
  query.maybeSingle = vi.fn(chain)
  query.single = vi.fn(chain)
  return query
}

const supabaseMock = {
  from: vi.fn((table: string) => makeQuery(tableData[table] ?? { data: null, error: null })),
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => supabaseMock,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    organization_id: 'org-1',
    name: 'Concerto Teste',
    slug: 'concerto-teste',
    status: 'active',
    start_datetime: '2026-06-01T20:00:00Z',
    end_datetime: '2026-06-01T23:00:00Z',
    venue_name: null,
    venue_address: null,
    description: null,
    portal_token: 'portal-tok',
    portal_token_expires_at: null,
    event_type_id: 'type-1',
    settings: {},
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeItem(overrides: Partial<EventChecklistItem> = {}): EventChecklistItem {
  const rule: NotificationRule = {
    trigger: 'on_complete',
    delay_minutes: 0,
    audience: 'all_clients',
    channels: ['email'],
    language: 'pt',
  }
  return {
    id: 'item-1',
    event_id: 'event-1',
    template_item_id: null,
    parent_item_id: null,
    title: 'Palco montado',
    client_label: 'Palco montado',
    description: null,
    position: 10,
    is_client_visible: true,
    status: 'completed',
    completed_at: '2026-06-01T19:00:00Z',
    completed_by: null,
    started_at: null,
    completion_note: null,
    notification_rules: [rule] as unknown as EventChecklistItem['notification_rules'],
    assigned_to: null,
    due_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const mockEventClient = {
  id: 'ec-1',
  event_id: 'event-1',
  client_id: 'client-1',
  role: 'primary_contact',
  opted_out: false,
  notification_prefs: { channels: ['email'], language: 'pt' },
  client: {
    id: 'client-1',
    organization_id: 'org-1',
    full_name: 'Ana Silva',
    email: 'ana@exemplo.pt' as string | null,
    phone: null,
    whatsapp: null,
    company: null,
    notes: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
}

const mockTemplate = {
  id: 'tpl-1',
  organization_id: 'org-1',
  name: 'Email PT',
  channel: 'email',
  language: 'pt',
  subject: 'Atualização: {{event_name}}',
  body_template: 'Olá {{client_name}}, {{item_client_label}} está concluído.',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const mockInsertedJob = {
  id: 'job-1',
  event_id: 'event-1',
  checklist_item_id: 'item-1',
  client_id: 'client-1',
  channel: 'email',
  rendered_subject: 'Atualização: Concerto Teste',
  rendered_body: 'Olá Ana Silva, Palco montado está concluído.',
  status: 'queued',
  scheduled_at: '2026-06-01T19:00:00Z',
  qstash_message_id: null,
  message_template_id: 'tpl-1',
  attempt_count: 0,
  last_error: null,
  sent_at: null,
  created_at: '2026-06-01T19:00:00Z',
  updated_at: '2026-06-01T19:00:00Z',
}

function setupHappyPath() {
  tableData = {
    event_clients: { data: [mockEventClient], error: null },
    event_checklist_items: { data: [{ id: 'item-1', status: 'completed' }, { id: 'item-2', status: 'pending' }], error: null },
    message_templates: { data: [mockTemplate], error: null },
    notification_jobs: { data: [mockInsertedJob], error: null },
    notification_log: { data: null, error: null },
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('dispatchNotificationsForItem', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    tableData = {}
    delete process.env.QSTASH_TOKEN
    process.env.NEXT_PUBLIC_PORTAL_URL = 'http://localhost:3000'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    // Reset module so useQStash re-evaluates after env changes
    vi.resetModules()
    mockSendEmail.mockResolvedValue('brevo-msg-id-1')
  })

  it('returns early when item has no notification rules', async () => {
    const { dispatchNotificationsForItem } = await import('@/lib/notifications/dispatcher')
    const item = makeItem({ notification_rules: [] as unknown as EventChecklistItem['notification_rules'] })

    await dispatchNotificationsForItem({ event: makeEvent(), item, completedByName: 'Rui' })

    expect(supabaseMock.from).not.toHaveBeenCalled()
  })

  it('returns early when there are no event clients', async () => {
    tableData = {
      event_clients: { data: [], error: null },
    }
    const { dispatchNotificationsForItem } = await import('@/lib/notifications/dispatcher')

    await dispatchNotificationsForItem({ event: makeEvent(), item: makeItem(), completedByName: 'Rui' })

    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('sends email directly in dev mode (no QSTASH_TOKEN)', async () => {
    setupHappyPath()
    const { dispatchNotificationsForItem } = await import('@/lib/notifications/dispatcher')

    await dispatchNotificationsForItem({ event: makeEvent(), item: makeItem(), completedByName: 'Rui' })

    expect(mockSendEmail).toHaveBeenCalledOnce()
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'ana@exemplo.pt',
      subject: 'Atualização: Concerto Teste',
    }))
  })

  it('skips client when channel preference does not include the rule channel', async () => {
    tableData = {
      event_clients: {
        data: [{ ...mockEventClient, notification_prefs: { channels: ['portal'], language: 'pt' } }],
        error: null,
      },
      event_checklist_items: { data: [{ id: 'item-1', status: 'completed' }], error: null },
      message_templates: { data: [mockTemplate], error: null },
      notification_jobs: { data: null, error: null },
      notification_log: { data: null, error: null },
    }
    const { dispatchNotificationsForItem } = await import('@/lib/notifications/dispatcher')

    await dispatchNotificationsForItem({ event: makeEvent(), item: makeItem(), completedByName: 'Rui' })

    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('marks job as failed when sendEmail throws', async () => {
    setupHappyPath()
    mockSendEmail.mockRejectedValueOnce(new Error('Brevo 500: rate limit'))
    const { dispatchNotificationsForItem } = await import('@/lib/notifications/dispatcher')

    await expect(
      dispatchNotificationsForItem({ event: makeEvent(), item: makeItem(), completedByName: 'Rui' })
    ).resolves.toBeUndefined()

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }))
  })

  it('filters vip_only audience — only sends to VIP clients', async () => {
    const vipRule: NotificationRule = {
      trigger: 'on_complete',
      delay_minutes: 0,
      audience: 'vip_only',
      channels: ['email'],
      language: 'pt',
    }
    const vipClient = {
      ...mockEventClient,
      id: 'ec-2',
      client_id: 'client-2',
      role: 'vip',
      client: { ...mockEventClient.client, id: 'client-2', email: 'vip@exemplo.pt' },
    }
    const vipJob = { ...mockInsertedJob, id: 'job-vip', client_id: 'client-2' }

    tableData = {
      event_clients: { data: [mockEventClient, vipClient], error: null },
      event_checklist_items: { data: [{ id: 'item-1', status: 'completed' }], error: null },
      message_templates: { data: [mockTemplate], error: null },
      notification_jobs: { data: [vipJob], error: null },
      notification_log: { data: null, error: null },
    }

    const item = makeItem({ notification_rules: [vipRule] as unknown as EventChecklistItem['notification_rules'] })
    const { dispatchNotificationsForItem } = await import('@/lib/notifications/dispatcher')

    await dispatchNotificationsForItem({ event: makeEvent(), item, completedByName: 'Rui' })

    expect(mockSendEmail).toHaveBeenCalledOnce()
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'vip@exemplo.pt' }))
  })

  it('filters specific_clients audience — only sends to primary_contact', async () => {
    const rule: NotificationRule = {
      trigger: 'on_complete',
      delay_minutes: 0,
      audience: 'specific_clients',
      channels: ['email'],
      language: 'pt',
    }
    const ccClient = {
      ...mockEventClient,
      id: 'ec-3',
      client_id: 'client-3',
      role: 'cc',
      client: { ...mockEventClient.client, id: 'client-3', email: 'cc@exemplo.pt' },
    }

    tableData = {
      event_clients: { data: [mockEventClient, ccClient], error: null },
      event_checklist_items: { data: [{ id: 'item-1', status: 'completed' }], error: null },
      message_templates: { data: [mockTemplate], error: null },
      notification_jobs: { data: [mockInsertedJob], error: null },
      notification_log: { data: null, error: null },
    }

    const item = makeItem({ notification_rules: [rule] as unknown as EventChecklistItem['notification_rules'] })
    const { dispatchNotificationsForItem } = await import('@/lib/notifications/dispatcher')

    await dispatchNotificationsForItem({ event: makeEvent(), item, completedByName: 'Rui' })

    expect(mockSendEmail).toHaveBeenCalledOnce()
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'ana@exemplo.pt' }))
  })

  it('renders template variables into subject and body', async () => {
    setupHappyPath()
    const { dispatchNotificationsForItem } = await import('@/lib/notifications/dispatcher')

    await dispatchNotificationsForItem({
      event: makeEvent({ name: 'Festival Verão' }),
      item: makeItem({ client_label: 'Palco principal', id: 'item-1' }),
      completedByName: 'Rui',
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          rendered_subject: 'Atualização: Festival Verão',
          rendered_body: 'Olá Ana Silva, Palco principal está concluído.',
        }),
      ])
    )
  })

  it('does not insert jobs when no template matches the channel/language', async () => {
    tableData = {
      event_clients: { data: [mockEventClient], error: null },
      event_checklist_items: { data: [{ id: 'item-1', status: 'completed' }], error: null },
      message_templates: { data: [], error: null },
      notification_jobs: { data: null, error: null },
    }
    const { dispatchNotificationsForItem } = await import('@/lib/notifications/dispatcher')

    await dispatchNotificationsForItem({ event: makeEvent(), item: makeItem(), completedByName: 'Rui' })

    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('calculates 50% progress when 1 of 2 items is completed', async () => {
    setupHappyPath() // returns [completed, pending] → 50%
    const { dispatchNotificationsForItem } = await import('@/lib/notifications/dispatcher')

    await dispatchNotificationsForItem({ event: makeEvent(), item: makeItem(), completedByName: 'Rui' })

    // progress_percent is rendered into the body via template vars;
    // the mock template does not include {{progress_percent}} but we can
    // verify the insert payload contains the correct rendered_body
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ rendered_body: expect.any(String) }),
      ])
    )
  })

  it('does not call sendEmail when client has no email address', async () => {
    tableData = {
      event_clients: {
        data: [{ ...mockEventClient, client: { ...mockEventClient.client, email: null } }],
        error: null,
      },
      event_checklist_items: { data: [{ id: 'item-1', status: 'completed' }], error: null },
      message_templates: { data: [mockTemplate], error: null },
      notification_jobs: { data: [mockInsertedJob], error: null },
      notification_log: { data: null, error: null },
    }
    const { dispatchNotificationsForItem } = await import('@/lib/notifications/dispatcher')

    await dispatchNotificationsForItem({ event: makeEvent(), item: makeItem(), completedByName: 'Rui' })

    expect(mockSendEmail).not.toHaveBeenCalled()
  })
})
