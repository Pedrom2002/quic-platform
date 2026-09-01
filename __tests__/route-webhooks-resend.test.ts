import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import crypto from 'crypto'

// Mock functions will be created in beforeEach, but we need to declare them here for TypeScript
let mockMaybeSingle: ReturnType<typeof vi.fn>
let mockInsert: ReturnType<typeof vi.fn>
let mockUpdate: ReturnType<typeof vi.fn>
let mockEq: ReturnType<typeof vi.fn>
let mockLimit: ReturnType<typeof vi.fn>
let mockSelect: ReturnType<typeof vi.fn>
let mockFrom: ReturnType<typeof vi.fn>

const makeFromChain = () => ({
  insert: mockInsert,
  select: mockSelect,
  eq: mockEq,
  limit: mockLimit,
  maybeSingle: mockMaybeSingle,
  update: mockUpdate,
})

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}))

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => ({ body, status: init?.status ?? 200 })),
  },
}))

vi.mock('@/lib/env', () => ({
  getEnv: () => ({ RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET }),
}))

import { POST } from '@/app/api/webhooks/resend/route'

// Secret: "whsec_" + base64("test-secret-bytes")
const RAW_SECRET_BYTES = 'test-secret-bytes'
const SECRET = 'whsec_' + Buffer.from(RAW_SECRET_BYTES).toString('base64')

function buildValidSig(id: string, timestamp: string, body: string): string {
  const secretBytes = SECRET.split('_')[1]
  const key = Buffer.from(secretBytes, 'base64')
  const toSign = `${id}.${timestamp}.${body}`
  const sig = crypto.createHmac('sha256', key).update(toSign).digest('base64')
  return `v1,${sig}`
}

function makeRequest(body: string, sig: string, id = 'msg-1', ts = '1700000000') {
  return new Request('http://localhost/api/webhooks/resend', {
    method: 'POST',
    body,
    headers: {
      'svix-signature': sig,
      'svix-timestamp': ts,
      'svix-id': id,
    },
  })
}

// Os pedidos de teste usam svix-timestamp fixo (1700000000). A rota rejeita
// timestamps fora de uma janela de +-5min, por isso o relogio fica congelado
// nesse instante — o teste de replay abaixo avanca-o de proposito.
const FROZEN_NOW_SECONDS = 1_700_000_000

describe('POST /api/webhooks/resend', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FROZEN_NOW_SECONDS * 1000)

    // Initialize mocks
    mockMaybeSingle = vi.fn().mockResolvedValue({ data: null })
    mockInsert = vi.fn().mockResolvedValue({ error: null })
    mockUpdate = vi.fn().mockReturnThis()
    mockEq = vi.fn().mockReturnThis()
    mockLimit = vi.fn().mockReturnThis()
    mockSelect = vi.fn().mockReturnThis()
    mockFrom = vi.fn().mockReturnValue(makeFromChain())

    process.env.RESEND_WEBHOOK_SECRET = SECRET
    vi.clearAllMocks()

    // Re-setup mocks after clearAllMocks
    mockMaybeSingle = vi.fn().mockResolvedValue({ data: null })
    mockInsert = vi.fn().mockResolvedValue({ error: null })
    mockUpdate = vi.fn().mockReturnThis()
    mockEq = vi.fn().mockReturnThis()
    mockLimit = vi.fn().mockReturnThis()
    mockSelect = vi.fn().mockReturnThis()
    mockFrom = vi.fn().mockReturnValue(makeFromChain())
  })

  afterEach(() => {
    vi.useRealTimers()
    delete process.env.RESEND_WEBHOOK_SECRET
  })

  it('returns 401 when a valid signature is replayed outside the tolerance window', async () => {
    const body = '{"type":"email.sent","data":{}}'
    const ts = String(FROZEN_NOW_SECONDS)
    const sig = buildValidSig('msg-replay', ts, body)

    // Mesma assinatura, mas capturada e reenviada 10 minutos depois.
    vi.setSystemTime((FROZEN_NOW_SECONDS + 10 * 60) * 1000)

    const res = await POST(makeRequest(body, sig, 'msg-replay', ts))
    expect(res.status).toBe(401)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns 401 for a non-numeric timestamp', async () => {
    const body = '{"type":"email.sent","data":{}}'
    const sig = buildValidSig('msg-nan', 'not-a-number', body)
    const res = await POST(makeRequest(body, sig, 'msg-nan', 'not-a-number'))
    expect(res.status).toBe(401)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns 503 when RESEND_WEBHOOK_SECRET not set', async () => {
    delete process.env.RESEND_WEBHOOK_SECRET
    const req = makeRequest('{}', 'v1,badsig')
    const res = await POST(req)
    expect(res.status).toBe(503)
  })

  it('returns 401 for invalid signature', async () => {
    const req = makeRequest('{"type":"email.sent","data":{}}', 'v1,invalidsig')
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 200 and stores webhook event for valid signature with no email_id', async () => {
    const body = JSON.stringify({ type: 'email.sent', data: {} })
    const req = makeRequest(body, buildValidSig('msg-1', '1700000000', body))
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockInsert).toHaveBeenCalledTimes(1) // only webhook_events
  })

  it('returns 200 and skips log when email_id present but event type unknown', async () => {
    const body = JSON.stringify({ type: 'email.clicked', data: { email_id: 'brevo-1' } })
    const req = makeRequest(body, buildValidSig('msg-2', '1700000001', body), 'msg-2', '1700000001')
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockInsert).toHaveBeenCalledTimes(1) // only webhook_events
  })

  // O webhook recebe eventos do Resend, mas o envio real de email é feito via
  // Brevo (provider_message_id gravado pelo worker é sempre um ID da Brevo,
  // nunca do Resend) — o matching por email_id nunca encontraria o job
  // correto e foi removido (ver app/api/webhooks/resend/route.ts). O webhook
  // agora só regista o evento em webhook_events, sem tentar ligar a um job.
  it('does not attempt job matching for delivered event (no provider correspondente)', async () => {
    const body = JSON.stringify({ type: 'email.delivered', data: { email_id: 'resend-2' } })
    const req = makeRequest(body, buildValidSig('msg-3', '1700000002', body), 'msg-3', '1700000002')
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockInsert).toHaveBeenCalledTimes(1) // only webhook_events
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('does not attempt job matching for opened event', async () => {
    const body = JSON.stringify({ type: 'email.opened', data: { email_id: 'resend-4' } })
    const req = makeRequest(body, buildValidSig('msg-5', '1700000004', body), 'msg-5', '1700000004')
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockInsert).toHaveBeenCalledTimes(1)
  })

  it('does not attempt job matching for bounced event', async () => {
    const body = JSON.stringify({ type: 'email.bounced', data: { email_id: 'resend-5' } })
    const req = makeRequest(body, buildValidSig('msg-6', '1700000005', body), 'msg-6', '1700000005')
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockInsert).toHaveBeenCalledTimes(1)
  })

  it('does not insert extra log when logEntry not found for delivered event', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null })
    const body = JSON.stringify({ type: 'email.delivered', data: { email_id: 'brevo-6' } })
    const req = makeRequest(body, buildValidSig('msg-7', '1700000006', body), 'msg-7', '1700000006')
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockInsert).toHaveBeenCalledTimes(1) // only webhook_events
  })
})
