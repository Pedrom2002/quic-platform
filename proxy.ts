import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Rate limiters — sliding window.
//
// When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, limits are
// enforced globally across all Vercel instances via Upstash Redis (HTTP REST).
// Without Redis, each instance keeps its own in-process Map — acceptable for
// throttling casual abuse but not for strict global enforcement.
// ---------------------------------------------------------------------------

const PORTAL_RATE_LIMIT   = 60  // req per minute per IP
const AUTH_RATE_LIMIT     = 10  // req per minute per IP
const RATE_WINDOW_S       = 60
const RATE_WINDOW_MS      = RATE_WINDOW_S * 1_000

// In-process fallback maps (per serverless instance)
const portalHits   = new Map<string, number[]>()
const authHits     = new Map<string, number[]>()

function inProcessLimited(map: Map<string, number[]>, ip: string, limit: number): boolean {
  const now    = Date.now()
  const cutoff = now - RATE_WINDOW_MS
  const ts     = (map.get(ip) ?? []).filter(t => t > cutoff)
  if (ts.length >= limit) return true
  ts.push(now)
  map.set(ip, ts)
  return false
}

async function upstashLimited(key: string, limit: number): Promise<boolean> {
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return false // signal: not configured

  const redisKey = `rl:mw:${key}`
  const body = [
    ['INCR', redisKey],
    ['EXPIRE', redisKey, String(RATE_WINDOW_S), 'NX'],
  ]

  try {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(2_000),
    })
    if (!res.ok) return false
    const data = (await res.json()) as Array<{ result: number }>
    return Number(data[0]?.result ?? 0) > limit
  } catch {
    return false // fail-open for middleware: prefer availability over strict limiting
  }
}

async function isPortalRateLimited(ip: string): Promise<boolean> {
  const upstashConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  if (upstashConfigured) {
    return upstashLimited(`portal:${ip}`, PORTAL_RATE_LIMIT)
  }
  return inProcessLimited(portalHits, ip, PORTAL_RATE_LIMIT)
}

async function isAuthRateLimited(ip: string): Promise<boolean> {
  const upstashConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  if (upstashConfigured) {
    return upstashLimited(`auth:${ip}`, AUTH_RATE_LIMIT)
  }
  return inProcessLimited(authHits, ip, AUTH_RATE_LIMIT)
}

// On Vercel the real client IP is the LAST entry in x-forwarded-for;
// earlier entries are attacker-controlled and must not be trusted for rate limiting.
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const last = forwarded.split(',').at(-1)?.trim()
    if (last) return last
  }
  return request.headers.get('x-real-ip') ?? 'unknown'
}

const isProd = process.env.NODE_ENV === 'production'

// Routes that legitimately receive cross-origin POST (external callers — no CSRF guard).
const CSRF_EXEMPT_PREFIXES = ['/api/webhooks/', '/api/workers/', '/api/cron/', '/api/portal/', '/api/marketing/send', '/api/marketing/bounce-poll', '/api/marketing/reply-poll', '/api/marketing/track/', '/api/marketing/unsubscribe']
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PREFIXES.some(p => pathname.startsWith(p))
}

function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!)
  return btoa(bin)
}

// Vercel Blob storage hostname — uploaded files are served from this domain.
// The exact subdomain varies by project (e.g. <hash>.public.blob.vercel-storage.com)
// so we allow the root wildcard.
const VERCEL_BLOB_HOST = 'https://*.public.blob.vercel-storage.com'
// Vercel Blob API endpoint — used by @vercel/blob/client for direct browser-to-blob uploads.
const VERCEL_BLOB_API = 'https://vercel.com'

function buildCsp(nonce: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

  const scriptSrc = isProd
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'`
    : `'self' 'nonce-${nonce}' 'unsafe-inline' 'unsafe-eval'`

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    "font-src 'self' https://fonts.gstatic.com",
    `img-src 'self' data: blob: ${supabaseUrl} https://*.unsplash.com https://images.unsplash.com ${VERCEL_BLOB_HOST} https://api.qrserver.com`,
    `frame-src https://images.unsplash.com ${VERCEL_BLOB_HOST}`,
    `connect-src 'self' ${supabaseUrl} https://*.supabase.com wss://*.supabase.co ${VERCEL_BLOB_HOST} ${VERCEL_BLOB_API}`,
    `media-src 'self' blob: ${VERCEL_BLOB_HOST}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ')
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // CSRF guard: reject cross-origin mutation requests on internal API routes.
  // Relies on Sec-Fetch-Site (supported in all modern browsers) with Origin as fallback.
  if (
    pathname.startsWith('/api/') &&
    !SAFE_METHODS.has(request.method) &&
    !isCsrfExempt(pathname)
  ) {
    const sfs = request.headers.get('sec-fetch-site')
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')

    const sameOrigin = sfs === 'same-origin'
    const originOk = (() => {
      if (!origin || !host) return false
      try { return new URL(origin).host === host } catch { return false }
    })()

    if (!sameOrigin && !originOk) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const ip = getClientIp(request)

  if (pathname.startsWith('/portal/') || pathname.startsWith('/api/portal/')) {
    if (await isPortalRateLimited(ip)) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': '60', 'Content-Type': 'text/plain' },
      })
    }
  }

  if (pathname.startsWith('/auth/')) {
    if (await isAuthRateLimited(ip)) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': '60', 'Content-Type': 'text/plain' },
      })
    }
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isPublic =
    pathname === '/app' ||
    pathname.startsWith('/golden-circle') ||
    pathname.startsWith('/portal/') ||
    pathname.startsWith('/artista/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/investors/login') ||
    pathname.startsWith('/investors/signup') ||
    pathname.startsWith('/api/investors/') ||
    pathname.startsWith('/rentals') ||
    pathname.startsWith('/api/rentals/') ||
    pathname.startsWith('/api/portal/') ||
    pathname.startsWith('/api/cron/') ||
    pathname.startsWith('/api/workers/') ||
    pathname.startsWith('/api/webhooks/') ||
    pathname.startsWith('/api/marketing/track/') ||
    pathname.startsWith('/api/marketing/unsubscribe') ||
    pathname.startsWith('/api/marketing/send') ||
    pathname.startsWith('/api/marketing/bounce-poll') ||
    pathname.startsWith('/api/marketing/reply-poll')

  if (!user && !isPublic) {
    // API routes must return 401, not redirect — redirecting breaks REST clients
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (user && pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Inject CSP nonce for HTML routes (skip API routes and Next.js internals)
  const isHtmlRoute =
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/_next/')

  if (isHtmlRoute) {
    const nonce = generateNonce()
    supabaseResponse.headers.set('Content-Security-Policy', buildCsp(nonce))
    supabaseResponse.headers.set('x-nonce', nonce)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.ico|.*\\.webp|.*\\.mp4|.*\\.webm|.*\\.mov|.*\\.ogg|.*\\.mp3|.*\\.wav).*)',
    '/api/portal/:path*',
  ],
}
