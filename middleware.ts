import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// In-process rate limiter for public portal endpoints.
// Sliding window: PORTAL_RATE_LIMIT requests per PORTAL_RATE_WINDOW_MS.
// The Map is per-process; on Vercel each serverless instance is independent,
// which is acceptable — the goal is to throttle casual abuse, not enforce
// exact global limits.
// ---------------------------------------------------------------------------
const PORTAL_RATE_LIMIT = 60          // requests
const PORTAL_RATE_WINDOW_MS = 60_000  // per minute

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rate-limit public portal pages and API
  if (pathname.startsWith('/portal/') || pathname.startsWith('/api/portal/')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    if (isRateLimited(ip)) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': '60',
          'Content-Type': 'text/plain',
        },
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

  // Rotas públicas: portal e auth
  const isPublic = pathname.startsWith('/portal/') || pathname.startsWith('/auth/')

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (user && pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  // Exclude static assets but include /api/portal/* for rate limiting
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)', '/api/portal/:path*'],
}
