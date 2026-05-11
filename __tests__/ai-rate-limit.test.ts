import { describe, it, expect } from 'vitest'
import { isAiRateLimited } from '@/lib/ai-rate-limit'

describe('isAiRateLimited', () => {
  it('always returns false (stub)', async () => {
    expect(await isAiRateLimited('org-123')).toBe(false)
  })

  it('returns false for empty string org', async () => {
    expect(await isAiRateLimited('')).toBe(false)
  })
})
