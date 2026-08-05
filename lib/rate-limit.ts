// Generic IP-based rate limiter for public/unauthenticated routes (login, signup).
// Uses Upstash Redis REST API when configured (global across instances),
// falls back to in-process sliding window otherwise.

const isProd = process.env.NODE_ENV === 'production'

type Entry = { count: number; resetAt: number }
const store = new Map<string, Entry>()

function memoryLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const e = store.get(key)
  if (!e || e.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  if (e.count >= limit) return true
  e.count += 1
  return false
}

async function upstashLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('upstash-not-configured')

  const ttlSeconds = Math.ceil(windowMs / 1000)
  const redisKey = `rl:${key}`

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
  return Number(data[0]?.result ?? 0) > limit
}

/**
 * Rate-limits by an arbitrary key (typically `${routeName}:${ip}`).
 * Fails open in dev (no Upstash configured), fails closed in production
 * if Upstash is configured but unreachable.
 */
export async function isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
  const upstashConfigured = !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  )

  if (upstashConfigured) {
    try {
      return await upstashLimit(key, limit, windowMs)
    } catch (e) {
      console.warn('[rate-limit] upstash failed:', e)
      if (isProd) return true // fail-closed: better a false 429 than unbounded abuse
    }
  }

  return memoryLimit(key, limit, windowMs)
}

export function getClientIp(request: Request): string {
  // x-vercel-forwarded-for is set by Vercel's edge network itself and
  // cannot be overridden by the client, unlike x-forwarded-for, whose
  // leftmost entry is attacker-controlled (a client can send its own
  // X-Forwarded-For header, which gets prepended ahead of the real chain,
  // so trusting index [0] there lets every request pick its own rate-limit
  // bucket). Prefer the Vercel-trusted header when present.
  const vercelForwarded = request.headers.get('x-vercel-forwarded-for')
  if (vercelForwarded) return vercelForwarded.split(',')[0].trim()
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}
