// Rate limiter for AI routes.
// Uses Upstash Redis REST API when configured (global across instances),
// falls back to in-process sliding window otherwise.
// Quota: 50 calls per organization per hour.

const AI_RATE_LIMIT = 50
const AI_RATE_WINDOW_MS = 60 * 60 * 1_000

const isProd = process.env.NODE_ENV === 'production'

type Entry = { count: number; resetAt: number }
const store = new Map<string, Entry>()

function memoryLimit(key: string): boolean {
  const now = Date.now()
  const e = store.get(key)
  if (!e || e.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + AI_RATE_WINDOW_MS })
    return false
  }
  if (e.count >= AI_RATE_LIMIT) return true
  e.count += 1
  return false
}

async function upstashLimit(key: string): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('upstash-not-configured')

  const ttlSeconds = Math.ceil(AI_RATE_WINDOW_MS / 1000)
  const redisKey = `ai-rl:${key}`

  const body = [
    ['INCR', redisKey],
    ['EXPIRE', redisKey, String(ttlSeconds), 'NX'],
  ]

  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(3_000),
  })

  if (!res.ok) throw new Error(`upstash ${res.status}`)

  const data = (await res.json()) as Array<{ result: number }>
  return Number(data[0]?.result ?? 0) > AI_RATE_LIMIT
}

export async function isAiRateLimited(organizationId: string): Promise<boolean> {
  const key = `org:${organizationId}`
  const upstashConfigured = !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  )

  if (upstashConfigured) {
    try {
      return await upstashLimit(key)
    } catch (e) {
      console.warn('[ai-rate-limit] upstash failed:', e)
      if (isProd) return true // fail-closed: better a false 429 than unbounded API cost
    }
  }

  return memoryLimit(key)
}
