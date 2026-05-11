import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn().mockReturnValue({ auth: {} }),
}))

describe('lib/supabase/client createClient', () => {
  const saved = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = saved.url
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = saved.key
  })

  it('throws when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const { createClient } = await import('@/lib/supabase/client')
    expect(() => createClient()).toThrow('Supabase public env vars not set')
  })

  it('throws when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const { createClient } = await import('@/lib/supabase/client')
    expect(() => createClient()).toThrow('Supabase public env vars not set')
  })

  it('returns client when both env vars are present', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    const { createClient } = await import('@/lib/supabase/client')
    expect(createClient()).toBeDefined()
  })
})
