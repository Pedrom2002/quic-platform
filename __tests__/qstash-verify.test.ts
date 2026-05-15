import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockVerify = vi.fn()

vi.mock('@upstash/qstash', () => {
  const Receiver = vi.fn(function(this: any) {
    this.verify = mockVerify
  })
  return { Receiver }
})

vi.mock('@/lib/env', () => ({
  getEnv: () => ({
    QSTASH_CURRENT_SIGNING_KEY: process.env.QSTASH_CURRENT_SIGNING_KEY,
    QSTASH_NEXT_SIGNING_KEY: process.env.QSTASH_NEXT_SIGNING_KEY,
  }),
}))

import { verifyQStashSignature } from '@/lib/qstash/verify'

describe('verifyQStashSignature', () => {
  beforeEach(() => {
    process.env.QSTASH_CURRENT_SIGNING_KEY = 'current'
    process.env.QSTASH_NEXT_SIGNING_KEY = 'next'
    mockVerify.mockResolvedValue(true)
  })

  afterEach(() => {
    delete process.env.QSTASH_CURRENT_SIGNING_KEY
    delete process.env.QSTASH_NEXT_SIGNING_KEY
    vi.clearAllMocks()
  })

  it('returns false when upstash-signature header is missing', async () => {
    const req = new Request('http://localhost', { method: 'POST', body: '{}' })
    expect(await verifyQStashSignature(req)).toBe(false)
  })

  it('returns false when QSTASH_CURRENT_SIGNING_KEY not set', async () => {
    delete process.env.QSTASH_CURRENT_SIGNING_KEY
    const req = new Request('http://localhost', {
      method: 'POST', body: '{}',
      headers: { 'upstash-signature': 'sig' },
    })
    expect(await verifyQStashSignature(req)).toBe(false)
  })

  it('returns false when QSTASH_NEXT_SIGNING_KEY not set', async () => {
    delete process.env.QSTASH_NEXT_SIGNING_KEY
    const req = new Request('http://localhost', {
      method: 'POST', body: '{}',
      headers: { 'upstash-signature': 'sig' },
    })
    expect(await verifyQStashSignature(req)).toBe(false)
  })

  it('returns true when Receiver.verify resolves', async () => {
    const req = new Request('http://localhost', {
      method: 'POST', body: '{"hello":"world"}',
      headers: { 'upstash-signature': 'valid-sig' },
    })
    expect(await verifyQStashSignature(req)).toBe(true)
  })

  it('returns false when Receiver.verify throws', async () => {
    mockVerify.mockRejectedValueOnce(new Error('bad signature'))
    const req = new Request('http://localhost', {
      method: 'POST', body: '{}',
      headers: { 'upstash-signature': 'bad' },
    })
    expect(await verifyQStashSignature(req)).toBe(false)
  })
})
