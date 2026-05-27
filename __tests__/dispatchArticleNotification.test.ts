import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Event } from '@/types/database'
import type { EventArticle } from '@/types/database'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockSendEmail = vi.fn().mockResolvedValue('brevo-msg-id-1')
const mockSendSms = vi.fn().mockResolvedValue('brevo-sms-id-1')

vi.mock('@/lib/notifications/channels/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  buildEmailHtml: () => '<html>mock</html>',
}))

vi.mock('@/lib/notifications/channels/sms', () => ({
  sendSms: (...args: unknown[]) => mockSendSms(...args),
}))

let tableData: Record<string, unknown> = {}

function makeQuery(resolvedValue: unknown) {
  const query: Record<string, unknown> = {}
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

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    organization_id: 'org-1',
    name: 'Casamento Ana',
    slug: 'casamento-ana',
    status: 'active',
    start_datetime: '2026-06-01T18:00:00Z',
    end_datetime: '2026-06-01T23:00:00Z',
    venue_name: null,
    venue_address: null,
    description: null,
    portal_token: 'tok',
    portal_token_expires_at: null,
    event_type_id: 'type-1',
    settings: {},
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeArticle(overrides: Partial<EventArticle> = {}): EventArticle {
  return {
    id: 'article-1',
    event_id: 'event-1',
    organization_id: 'org-1',
    title: 'Press piece',
    url: 'https://example.com/x',
    source: 'Publico',
    created_by: null,
    created_at: '2026-05-27T00:00:00Z',
    updated_at: '2026-05-27T00:00:00Z',
    ...overrides,
  }
}

// ─── Mock templates ───────────────────────────────────────────────────────────

const mockEmailTemplate = {
  id: 'tpl-art-email',
  organization_id: 'org-1',
  name: 'Novo artigo - Email',
  channel: 'email',
  language: 'pt',
  template_key: 'article_new',
  subject: 'Novo artigo sobre {{event_name}}',
  body_template: 'Ola {{client_name}}, artigo: {{article_title}} {{article_url}}',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const mockSmsTemplate = {
  id: 'tpl-art-sms',
  organization_id: 'org-1',
  name: 'Novo artigo - SMS',
  channel: 'sms',
  language: 'pt',
  template_key: 'article_new',
  subject: null,
  body_template: 'QUIC: novo artigo sobre {{event_name}} - {{article_title}} {{article_url}}',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const mockPortalTemplate = {
  id: 'tpl-art-portal',
  organization_id: 'org-1',
  name: 'Novo artigo - Portal',
  channel: 'portal',
  language: 'pt',
  template_key: 'article_new',
  subject: 'Novo artigo',
  body_template: '{{article_title}} - Fonte: {{article_source}}. Ver: {{article_url}}',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

// ─── Mock event client ────────────────────────────────────────────────────────

const mockEventClient = {
  id: 'ec-1',
  event_id: 'event-1',
  client_id: 'client-1',
  role: 'primary_contact',
  opted_out: false,
  notification_prefs: { channels: ['email', 'sms', 'portal'], language: 'pt' },
  client: {
    id: 'client-1',
    organization_id: 'org-1',
    full_name: 'Ana Silva',
    email: 'ana@exemplo.pt' as string | null,
    phone: '+351900000000' as string | null,
    whatsapp: null,
    company: null,
    notes: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('dispatchArticleNotification (no QStash)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    tableData = {}
    delete process.env.QSTASH_TOKEN
    process.env.NEXT_PUBLIC_PORTAL_URL = 'http://localhost:3000'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    vi.resetModules()
    mockSendEmail.mockResolvedValue('brevo-msg-id-1')
    mockSendSms.mockResolvedValue('brevo-sms-id-1')
  })

  it('sends email + sms when client has both channels', async () => {
    // 3 mock jobs inserted: one per channel (email, sms, portal)
    const mockEmailJob = {
      id: 'job-art-email',
      event_id: 'event-1',
      client_id: 'client-1',
      channel: 'email',
      event_article_id: 'article-1',
      status: 'queued',
      message_template_id: 'tpl-art-email',
      rendered_subject: 'Novo artigo sobre Casamento Ana',
      rendered_body: 'Ola Ana Silva, artigo: Press piece https://example.com/x',
      scheduled_at: '2026-05-27T00:00:00Z',
      attempt_count: 0,
      last_error: null,
      sent_at: null,
      qstash_message_id: null,
      created_at: '2026-05-27T00:00:00Z',
      updated_at: '2026-05-27T00:00:00Z',
    }
    const mockSmsJob = {
      ...mockEmailJob,
      id: 'job-art-sms',
      channel: 'sms',
      message_template_id: 'tpl-art-sms',
      rendered_subject: null,
      rendered_body: 'QUIC: novo artigo sobre Casamento Ana - Press piece https://example.com/x',
    }
    const mockPortalJob = {
      ...mockEmailJob,
      id: 'job-art-portal',
      channel: 'portal',
      message_template_id: 'tpl-art-portal',
      rendered_subject: 'Novo artigo',
      rendered_body: 'Press piece - Fonte: Publico. Ver: https://example.com/x',
    }

    tableData = {
      event_clients: { data: [mockEventClient], error: null },
      message_templates: { data: [mockEmailTemplate, mockSmsTemplate, mockPortalTemplate], error: null },
      notification_jobs: { data: [mockEmailJob, mockSmsJob, mockPortalJob], error: null },
    }

    const { dispatchArticleNotification } = await import('@/lib/notifications/dispatchArticleNotification')

    await dispatchArticleNotification({ event: makeEvent(), article: makeArticle() })

    // Insert first called with 3 rows (notification_jobs batch), each having event_article_id: 'article-1'
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ event_article_id: 'article-1' }),
      ])
    )
    const insertedRows = mockInsert.mock.calls[0][0] as unknown[]
    expect(insertedRows).toHaveLength(3)

    // email and sms channels trigger their respective senders
    expect(mockSendEmail).toHaveBeenCalledOnce()
    expect(mockSendSms).toHaveBeenCalledOnce()
  })

  it('skips clients with opted_out=true', async () => {
    // The Supabase query uses .eq('opted_out', false), so opted_out clients are
    // filtered server-side. The mock returns the already-filtered result: empty array.
    tableData = {
      event_clients: {
        data: [],
        error: null,
      },
      message_templates: { data: [mockEmailTemplate, mockSmsTemplate, mockPortalTemplate], error: null },
      notification_jobs: { data: null, error: null },
    }

    const { dispatchArticleNotification } = await import('@/lib/notifications/dispatchArticleNotification')

    await dispatchArticleNotification({ event: makeEvent(), article: makeArticle() })

    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
    expect(mockSendSms).not.toHaveBeenCalled()
  })

  it('returns silently when no article_new template found', async () => {
    tableData = {
      event_clients: { data: [mockEventClient], error: null },
      message_templates: { data: [], error: null },
      notification_jobs: { data: null, error: null },
    }

    const { dispatchArticleNotification } = await import('@/lib/notifications/dispatchArticleNotification')

    await expect(
      dispatchArticleNotification({ event: makeEvent(), article: makeArticle() })
    ).resolves.toBeUndefined()

    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('inserts jobs with event_article_id set', async () => {
    const mockEmailOnlyClient = {
      ...mockEventClient,
      notification_prefs: { channels: ['email'], language: 'pt' },
    }
    const mockEmailJob = {
      id: 'job-art-email-2',
      event_id: 'event-1',
      client_id: 'client-1',
      channel: 'email',
      event_article_id: 'article-1',
      status: 'queued',
      message_template_id: 'tpl-art-email',
      rendered_subject: 'Novo artigo sobre Casamento Ana',
      rendered_body: 'Ola Ana Silva, artigo: Press piece https://example.com/x',
      scheduled_at: '2026-05-27T00:00:00Z',
      attempt_count: 0,
      last_error: null,
      sent_at: null,
      qstash_message_id: null,
      created_at: '2026-05-27T00:00:00Z',
      updated_at: '2026-05-27T00:00:00Z',
    }

    tableData = {
      event_clients: { data: [mockEmailOnlyClient], error: null },
      message_templates: { data: [mockEmailTemplate], error: null },
      notification_jobs: { data: [mockEmailJob], error: null },
    }

    const { dispatchArticleNotification } = await import('@/lib/notifications/dispatchArticleNotification')

    await dispatchArticleNotification({ event: makeEvent(), article: makeArticle() })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ event_article_id: 'article-1' }),
      ])
    )
  })

  it('marks job as failed when sendEmail throws', async () => {
    const mockEmailOnlyClient = {
      ...mockEventClient,
      notification_prefs: { channels: ['email'], language: 'pt' },
    }
    const mockEmailJob = {
      id: 'job-art-fail',
      event_id: 'event-1',
      client_id: 'client-1',
      channel: 'email',
      event_article_id: 'article-1',
      status: 'queued',
      message_template_id: 'tpl-art-email',
      rendered_subject: 'Novo artigo sobre Casamento Ana',
      rendered_body: 'Ola Ana Silva, artigo: Press piece https://example.com/x',
      scheduled_at: '2026-05-27T00:00:00Z',
      attempt_count: 0,
      last_error: null,
      sent_at: null,
      qstash_message_id: null,
      created_at: '2026-05-27T00:00:00Z',
      updated_at: '2026-05-27T00:00:00Z',
    }

    tableData = {
      event_clients: { data: [mockEmailOnlyClient], error: null },
      message_templates: { data: [mockEmailTemplate], error: null },
      notification_jobs: { data: [mockEmailJob], error: null },
    }

    mockSendEmail.mockRejectedValueOnce(new Error('Brevo 500'))

    const { dispatchArticleNotification } = await import('@/lib/notifications/dispatchArticleNotification')

    await expect(
      dispatchArticleNotification({ event: makeEvent(), article: makeArticle() })
    ).resolves.toBeUndefined()

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }))
  })
})
