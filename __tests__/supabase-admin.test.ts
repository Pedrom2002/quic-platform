import { describe, it, expect, vi } from 'vitest'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({ from: vi.fn() }),
}))

vi.mock('@/lib/env', () => ({
  getEnv: vi.fn().mockReturnValue({
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
    PORTAL_JWT_SECRET: 'secret',
    QSTASH_CURRENT_SIGNING_KEY: undefined,
    QSTASH_NEXT_SIGNING_KEY: undefined,
  }),
}))

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'

describe('createAdminClient', () => {
  it('calls createClient with service role key and no-auth options', () => {
    const client = createAdminClient()
    expect(client).toBeDefined()
    expect(createClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'service-role-key',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  })

  it('returns the client from createClient', () => {
    const result = createAdminClient()
    expect(result).toHaveProperty('from')
  })
})
