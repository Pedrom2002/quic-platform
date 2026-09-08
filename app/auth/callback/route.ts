import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function isSafeRedirect(next: string): boolean {
  return next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
}

export async function GET(request: Request) {
  const { searchParams, origin: siteOrigin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/dashboard'
  const next = isSafeRedirect(nextParam) ? nextParam : '/dashboard'
  const requestOrigin = searchParams.get('origin')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${siteOrigin}/auth/login?error=auth_callback_failed`)
    }
  }

  const destination = requestOrigin
    ? `${siteOrigin}${next}?origin=${encodeURIComponent(requestOrigin)}`
    : `${siteOrigin}${next}`

  return NextResponse.redirect(destination)
}
