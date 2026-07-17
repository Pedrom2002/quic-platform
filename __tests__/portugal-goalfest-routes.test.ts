import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockSendSms } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSendSms: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/notifications/channels/sms', () => ({ sendSms: mockSendSms }))

const ADMIN = 'test-portugal-admin-password'

// Builder encadeável genérico: qualquer método devolve o próprio chain,
// await resolve para `result`. Regista chamadas a insert/update.
function chain(result: unknown, calls?: { inserts?: unknown[]; updates?: unknown[] }) {
  const c: Record<string, unknown> = {}
  const self = () => c
  for (const m of ['select', 'eq', 'is', 'or', 'order', 'limit', 'returns', 'maybeSingle', 'single']) {
    c[m] = vi.fn(self)
  }
  c.insert = vi.fn((payload: unknown) => {
    calls?.inserts?.push(payload)
    return c
  })
  c.update = vi.fn((payload: unknown) => {
    calls?.updates?.push(payload)
    return c
  })
  ;(c as { then?: unknown }).then = (resolve: (v: unknown) => void) => resolve(result)
  return c
}

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function get(path: string, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${path}`, { headers })
}

beforeEach(() => {
  mockFrom.mockReset()
  mockSendSms.mockReset()
})

describe('POST /api/portugal/validate', () => {
  it('401 without valid admin token', async () => {
    const { POST } = await import('@/app/api/portugal/validate/route')
    const res = await POST(post('/api/portugal/validate', { token: 'x' }, { 'x-admin-token': 'wrong' }))
    expect(res.status).toBe(401)
  })

  it('400 for invalid json', async () => {
    const { POST } = await import('@/app/api/portugal/validate/route')
    const res = await POST(post('/api/portugal/validate', '{nope', { 'x-admin-token': ADMIN }))
    expect(res.status).toBe(400)
  })

  it('redeems a fresh token atomically', async () => {
    mockFrom.mockReturnValueOnce(
      chain({ data: [{ id: 'w1', redeemed_at: null, portugal_registrations: { name: 'Ana' } }] })
    )
    const { POST } = await import('@/app/api/portugal/validate/route')
    const res = await POST(post('/api/portugal/validate', { token: 'tok' }, { 'x-admin-token': ADMIN }))
    const json = await res.json()
    expect(json).toEqual({ valid: true, name: 'Ana' })
  })

  it('reports already_used when token exists but was redeemed', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: [] }))
      .mockReturnValueOnce(chain({ data: { redeemed_at: '2026-07-10T00:00:00Z' } }))
    const { POST } = await import('@/app/api/portugal/validate/route')
    const res = await POST(post('/api/portugal/validate', { token: 'tok' }, { 'x-admin-token': ADMIN }))
    expect(await res.json()).toEqual({ valid: false, reason: 'already_used' })
  })

  it('reports not_found for unknown token', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: [] }))
      .mockReturnValueOnce(chain({ data: null }))
    const { POST } = await import('@/app/api/portugal/validate/route')
    const res = await POST(post('/api/portugal/validate', { token: 'tok' }, { 'x-admin-token': ADMIN }))
    expect(await res.json()).toEqual({ valid: false, reason: 'not_found' })
  })
})

describe('GET /api/portugal/count', () => {
  it('401 without token', async () => {
    const { GET } = await import('@/app/api/portugal/count/route')
    const res = await GET(get('/api/portugal/count'))
    expect(res.status).toBe(401)
  })

  it('returns count', async () => {
    mockFrom.mockReturnValueOnce(chain({ count: 42, error: null }))
    const { GET } = await import('@/app/api/portugal/count/route')
    const res = await GET(get('/api/portugal/count', { 'x-admin-token': ADMIN }))
    expect(await res.json()).toEqual({ count: 42 })
  })
})

describe('GET /api/portugal/registrations', () => {
  it('401 without token', async () => {
    const { GET } = await import('@/app/api/portugal/registrations/route')
    const res = await GET(get('/api/portugal/registrations'))
    expect(res.status).toBe(401)
  })

  it('returns both lists', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: [{ name: 'Ana' }], error: null }))
      .mockReturnValueOnce(chain({ data: [{ name: 'Rui' }], error: null }))
    const { GET } = await import('@/app/api/portugal/registrations/route')
    const res = await GET(get('/api/portugal/registrations', { 'x-admin-token': ADMIN }))
    const json = await res.json()
    expect(json.portugal).toHaveLength(1)
    expect(json.goalfest).toHaveLength(1)
  })
})

describe('POST /api/portugal/register', () => {
  it('422 for invalid phone', async () => {
    const { POST } = await import('@/app/api/portugal/register/route')
    const res = await POST(
      post('/api/portugal/register', {
        name: 'Ana Silva',
        email: 'ana@example.com',
        phone: '123',
        consent: true,
      })
    )
    expect(res.status).toBe(422)
  })

  it('422 without consent', async () => {
    const { POST } = await import('@/app/api/portugal/register/route')
    const res = await POST(
      post('/api/portugal/register', {
        name: 'Ana Silva',
        email: 'ana@example.com',
        phone: '912345678',
        consent: false,
      })
    )
    expect(res.status).toBe(422)
  })

  it('409 when email already registered', async () => {
    mockFrom.mockReturnValueOnce(
      chain({ data: { id: 'r1', email: 'ana@example.com', phone: '+351911111111' } })
    )
    const { POST } = await import('@/app/api/portugal/register/route')
    const res = await POST(
      post('/api/portugal/register', {
        name: 'Ana Silva',
        email: 'ana@example.com',
        phone: '912345678',
        consent: true,
      })
    )
    expect(res.status).toBe(409)
  })

  it('registers and normalizes phone to +351', async () => {
    const inserts: unknown[] = []
    mockFrom
      .mockReturnValueOnce(chain({ data: null }))
      .mockReturnValueOnce(chain({ error: null }, { inserts }))
    const { POST } = await import('@/app/api/portugal/register/route')
    const res = await POST(
      post('/api/portugal/register', {
        name: 'Ana Silva',
        email: 'ana@example.com',
        phone: '912345678',
        consent: true,
      })
    )
    expect(await res.json()).toEqual({ ok: true })
    expect((inserts[0] as Record<string, unknown>).phone).toBe('+351912345678')
  })
})

describe('POST /api/portugal/draw', () => {
  // um único registo: o shuffle Fisher-Yates torna a seleção aleatória
  const regs = [{ id: 'r1', name: 'Ana', email: 'a@example.com', phone: '+351911111111' }]

  it('401 without token', async () => {
    const { POST } = await import('@/app/api/portugal/draw/route')
    const res = await POST(post('/api/portugal/draw', { count: 1 }))
    expect(res.status).toBe(401)
  })

  it('409 when draw already ran (unique violation on lock)', async () => {
    mockFrom.mockReturnValueOnce(chain({ error: { code: '23505' } }))
    const { POST } = await import('@/app/api/portugal/draw/route')
    const res = await POST(post('/api/portugal/draw', { count: 1 }, { 'x-admin-token': ADMIN }))
    expect(res.status).toBe(409)
  })

  it('draws winners and sends sms', async () => {
    mockSendSms.mockResolvedValue('sms-id')
    mockFrom
      .mockReturnValueOnce(chain({ error: null })) // lock insert
      .mockReturnValueOnce(chain({ data: regs, error: null })) // registrations
      .mockReturnValueOnce(
        chain({ data: [{ id: 'w1', registration_id: 'r1', qr_token: 'q1' }], error: null })
      ) // winners insert
      .mockReturnValue(chain({ error: null })) // sms_sent_at updates
    const { POST } = await import('@/app/api/portugal/draw/route')
    const res = await POST(post('/api/portugal/draw', { count: 1 }, { 'x-admin-token': ADMIN }))
    const json = await res.json()
    expect(json.winners).toHaveLength(1)
    expect(json.winners[0].qr_token).toBe('q1')
    expect(mockSendSms).toHaveBeenCalledOnce()
    expect(mockSendSms.mock.calls[0][0].message).toContain('/portugal/qr/q1')
  })
})

describe('POST /api/goalfest/register', () => {
  it('registers and mirrors into portugal_registrations', async () => {
    const gfInserts: unknown[] = []
    const ptInserts: unknown[] = []
    mockFrom
      .mockReturnValueOnce(chain({ data: null })) // duplicate check
      .mockReturnValueOnce(chain({ error: null }, { inserts: gfInserts }))
      .mockReturnValueOnce(chain({ error: null }, { inserts: ptInserts }))
    const { POST } = await import('@/app/api/goalfest/register/route')
    const res = await POST(
      post('/api/goalfest/register', {
        name: 'Ana Silva',
        email: 'ana@example.com',
        phone: '912345678',
        consent: true,
      })
    )
    expect(await res.json()).toEqual({ ok: true })
    expect(gfInserts).toHaveLength(1)
    expect(ptInserts).toHaveLength(1)
  })

  it('409 for duplicate', async () => {
    mockFrom.mockReturnValueOnce(
      chain({ data: { id: 'g1', email: 'ana@example.com', phone: '+351911111111' } })
    )
    const { POST } = await import('@/app/api/goalfest/register/route')
    const res = await POST(
      post('/api/goalfest/register', {
        name: 'Ana Silva',
        email: 'ana@example.com',
        phone: '912345678',
        consent: true,
      })
    )
    expect(res.status).toBe(409)
  })
})
