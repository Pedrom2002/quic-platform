import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// In-process rate limiter for public portal endpoints.
// Sliding window: PORTAL_RATE_LIMIT requests per PORTAL_RATE_WINDOW_MS.
// The Map is per-process; on Vercel each serverless instance is independent,
// which is acceptable — the goal is to throttle casual abuse, not enforce
// exact global limits.
// ---------------------------------------------------------------------------
const PORTAL_RATE_LIMIT = 60
const PORTAL_RATE_WINDOW_MS = 60_000

const portalHits = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const cutoff = now - PORTAL_RATE_WINDOW_MS
  const timestamps = (portalHits.get(ip) ?? []).filter(t => t > cutoff)
  if (timestamps.length >= PORTAL_RATE_LIMIT) return true
  timestamps.push(now)
  portalHits.set(ip, timestamps)
  return false
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
const CSRF_EXEMPT_PREFIXES = ['/api/webhooks/', '/api/workers/', '/api/cron/', '/api/portal/']
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

function buildCsp(nonce: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

  const scriptSrc = isProd
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'`
    : `'self' 'nonce-${nonce}' 'unsafe-inline' 'unsafe-eval'`

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "font-src 'self' https://fonts.gstatic.com",
    `img-src 'self' data: blob: ${supabaseUrl}`,
    `connect-src 'self' ${supabaseUrl} https://*.supabase.com`,
    "media-src 'self' blob: https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ')
}

export async function middleware(request: NextRequest) {
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

  if (pathname.startsWith('/portal/') || pathname.startsWith('/api/portal/')) {
    const ip = getClientIp(request)
    if (isRateLimited(ip)) {
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

  const isPublic = pathname.startsWith('/portal/') || pathname.startsWith('/auth/')

  if (!user && !isPublic) {
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.ico|.*\\.webp).*)',
    '/api/portal/:path*',
  ],
}
