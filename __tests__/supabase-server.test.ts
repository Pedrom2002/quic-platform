import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockCookieStore, capturedHandlers } = vi.hoisted(() => {
  let _handlers: { getAll: () => unknown; setAll: (c: unknown[]) => void } | null = null
  const store = { getAll: vi.fn().mockReturnValue([]), set: vi.fn() }
  return {
    mockCookieStore: store,
    capturedHandlers: {
      get() { return _handlers },
      set(v: typeof _handlers) { _handlers = v },
    },
  }
})

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockImplementation((_url: string, _key: string, opts: { cookies: unknown }) => {
    capturedHandlers.set(opts.cookies as { getAll: () => unknown; setAll: (c: unknown[]) => void })
    return { __supabaseClient: true }
  }),
}))

vi.mock('@/lib/env', () => ({
  getEnv: vi.fn().mockReturnValue({
    NEXT_PUBLIC_SUPABASE_URL: 'https://proj.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  }),
}))

import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'

describe('lib/supabase/server createClient', () => {
  beforeEach(() => {
    capturedHandlers.set(null)
    mockCookieStore.getAll.mockClear()
    mockCookieStore.set.mockClear()
  })

  it('creates a Supabase server client using cookies', async () => {
    const client = await createClient()
    expect(client).toBeDefined()
    expect(createServerClient).toHaveBeenCalledWith(
      'https://proj.supabase.co',
      'anon-key',
      expect.objectContaining({ cookies: expect.any(Object) }),
    )
  })

  it('cookie getAll delegates to cookieStore', async () => {
    await createClient()
    const h = capturedHandlers.get()
    expect(h).not.toBeNull()
    h!.getAll()
    expect(mockCookieStore.getAll).toHaveBeenCalled()
  })

  it('cookie setAll delegates to cookieStore.set', async () => {
    await createClient()
    const h = capturedHandlers.get()!
    h.setAll([{ name: 'a', value: 'b', options: {} }])
    expect(mockCookieStore.set).toHaveBeenCalledWith('a', 'b', {})
  })

  it('cookie setAll swallows errors in server component context', async () => {
    await createClient()
    const h = capturedHandlers.get()!
    mockCookieStore.set.mockImplementationOnce(() => { throw new Error('cannot set in RSC') })
    expect(() => h.setAll([{ name: 'x', value: 'y', options: {} }])).not.toThrow()
  })
})
