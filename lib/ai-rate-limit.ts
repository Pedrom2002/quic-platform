// Rate limiter for AI routes. Quota: 50 calls per organization per hour.
import { isRateLimited } from '@/lib/rate-limit'

const AI_RATE_LIMIT = 50
const AI_RATE_WINDOW_MS = 60 * 60 * 1_000

export async function isAiRateLimited(organizationId: string): Promise<boolean> {
  return isRateLimited(`ai:org:${organizationId}`, AI_RATE_LIMIT, AI_RATE_WINDOW_MS)
}
