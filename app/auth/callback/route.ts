import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function isSafeRedirect(next: string): boolean {
  return next.startsWith('/') && !next.startsWith('//')
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/dashboard'
  const next = isSafeRedirect(nextParam) ? nextParam : '/dashboard'

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
