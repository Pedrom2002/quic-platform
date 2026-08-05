import { describe, it, expect } from 'vitest'
import { getClientIp } from '@/lib/rate-limit'

function req(headers: Record<string, string>) {
  return new Request('http://localhost/api/test', { headers })
}

describe('getClientIp', () => {
  it('prefers x-vercel-forwarded-for over x-forwarded-for', () => {
    const ip = getClientIp(req({
      'x-vercel-forwarded-for': '198.51.100.1',
      'x-forwarded-for': '203.0.113.99, 198.51.100.1',
    }))
    expect(ip).toBe('198.51.100.1')
  })

  it('is not fooled by a spoofed x-forwarded-for when x-vercel-forwarded-for is present', () => {
    const ip = getClientIp(req({
      'x-vercel-forwarded-for': '198.51.100.1',
      'x-forwarded-for': 'attacker-spoofed-value',
    }))
    expect(ip).toBe('198.51.100.1')
  })

  it('falls back to x-forwarded-for when x-vercel-forwarded-for is absent', () => {
    const ip = getClientIp(req({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }))
    expect(ip).toBe('203.0.113.5')
  })

  it('falls back to x-real-ip when neither forwarded header is present', () => {
    const ip = getClientIp(req({ 'x-real-ip': '203.0.113.7' }))
    expect(ip).toBe('203.0.113.7')
  })

  it('returns "unknown" when no IP header is present', () => {
    const ip = getClientIp(req({}))
    expect(ip).toBe('unknown')
  })
})
