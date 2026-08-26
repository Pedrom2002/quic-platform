import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockResolveTxt } = vi.hoisted(() => ({ mockResolveTxt: vi.fn() }))

vi.mock('node:dns', () => ({
  promises: { resolveTxt: mockResolveTxt },
}))

beforeEach(() => {
  mockResolveTxt.mockReset()
})

describe('checkSenderDns', () => {
  it('returns all-not-found for an email with no domain', async () => {
    const { checkSenderDns } = await import('@/lib/marketing/dns-check')
    const result = await checkSenderDns('not-an-email')

    expect(result.domain).toBe('')
    expect(result.spf.ok).toBe(false)
    expect(result.dkim.ok).toBe(false)
    expect(result.dmarc.ok).toBe(false)
    expect(mockResolveTxt).not.toHaveBeenCalled()
  })

  it('reports ok:true for SPF/DKIM found and DMARC with a non-none policy', async () => {
    mockResolveTxt.mockImplementation(async (host: string) => {
      if (host === 'example.com') return [['v=spf1 include:_spf.example.com ~all']]
      if (host === 'default._domainkey.example.com') return [['v=DKIM1; k=rsa; p=abc123']]
      if (host === '_dmarc.example.com') return [['v=DMARC1; p=reject']]
      throw new Error('NXDOMAIN')
    })

    const { checkSenderDns } = await import('@/lib/marketing/dns-check')
    const result = await checkSenderDns('sender@example.com')

    expect(result.domain).toBe('example.com')
    expect(result.spf.ok).toBe(true)
    expect(result.dkim.ok).toBe(true)
    expect(result.dmarc.ok).toBe(true)
    expect(result.dmarc.policy).toBe('reject')
  })

  it('reports dmarc.ok:false when the policy is "none"', async () => {
    mockResolveTxt.mockImplementation(async (host: string) => {
      if (host === '_dmarc.example.com') return [['v=DMARC1; p=none']]
      return []
    })

    const { checkSenderDns } = await import('@/lib/marketing/dns-check')
    const result = await checkSenderDns('sender@example.com')

    expect(result.dmarc.found).toBe(true)
    expect(result.dmarc.policy).toBe('none')
    expect(result.dmarc.ok).toBe(false)
  })

  it('treats a DNS lookup failure as not-found rather than throwing', async () => {
    mockResolveTxt.mockRejectedValue(new Error('NXDOMAIN'))

    const { checkSenderDns } = await import('@/lib/marketing/dns-check')
    const result = await checkSenderDns('sender@no-records.example')

    expect(result.spf.found).toBe(false)
    expect(result.dkim.found).toBe(false)
    expect(result.dmarc.found).toBe(false)
  })
})
