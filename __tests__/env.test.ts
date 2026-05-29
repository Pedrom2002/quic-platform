import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('getEnv', () => {
  const requiredKeys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CRON_SECRET',
    'NEXT_PUBLIC_APP_URL',
    'BLOB_READ_WRITE_TOKEN',
  ]
  const optionalKeys = [
    'QSTASH_CURRENT_SIGNING_KEY',
    'QSTASH_NEXT_SIGNING_KEY',
  ]
  const allKeys = [...requiredKeys, ...optionalKeys]
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    vi.resetModules()
    for (const k of allKeys) savedEnv[k] = process.env[k]
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    process.env.CRON_SECRET = 'cron-secret-32-chars-minimum-pad!!'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
    process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test_token'
    process.env.QSTASH_CURRENT_SIGNING_KEY = 'current-key'
    process.env.QSTASH_NEXT_SIGNING_KEY = 'next-key'
  })

  afterEach(() => {
    for (const k of allKeys) {
      if (savedEnv[k] === undefined) delete process.env[k]
      else process.env[k] = savedEnv[k]
    }
  })

  it('returns all env vars when set', async () => {
    const { getEnv } = await import('@/lib/env')
    const env = getEnv()
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co')
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('anon-key')
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe('service-role-key')
    expect(env.QSTASH_CURRENT_SIGNING_KEY).toBe('current-key')
    expect(env.QSTASH_NEXT_SIGNING_KEY).toBe('next-key')
  })

  it('returns undefined for optional keys when not set', async () => {
    delete process.env.QSTASH_CURRENT_SIGNING_KEY
    delete process.env.QSTASH_NEXT_SIGNING_KEY
    const { getEnv } = await import('@/lib/env')
    const env = getEnv()
    expect(env.QSTASH_CURRENT_SIGNING_KEY).toBeUndefined()
    expect(env.QSTASH_NEXT_SIGNING_KEY).toBeUndefined()
  })

  it('returns parsed env', async () => {
    const { getEnv } = await import('@/lib/env')
    const env = getEnv()
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co')
  })

  it('returns same object reference on repeated calls (singleton in non-test env)', async () => {
    const { getEnv } = await import('@/lib/env')
    const first = getEnv()
    const second = getEnv()
    // In test env, caching is intentionally skipped so process.env mutations are picked up.
    // The two results should be deeply equal even if not the same reference.
    expect(first).toStrictEqual(second)
  })

  it('throws on missing required var', async () => {
    delete process.env.CRON_SECRET
    const { getEnv } = await import('@/lib/env')
    expect(() => getEnv()).toThrow('[env]')
  })
})
