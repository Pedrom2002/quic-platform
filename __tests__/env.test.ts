import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getEnv } from '@/lib/env'

describe('getEnv', () => {
  const savedEnv: Record<string, string | undefined> = {}
  const keys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'PORTAL_JWT_SECRET',
    'QSTASH_CURRENT_SIGNING_KEY',
    'QSTASH_NEXT_SIGNING_KEY',
  ]

  beforeEach(() => {
    for (const k of keys) savedEnv[k] = process.env[k]
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    process.env.PORTAL_JWT_SECRET = 'secret-32-chars-minimum-padding!!'
    process.env.QSTASH_CURRENT_SIGNING_KEY = 'current-key'
    process.env.QSTASH_NEXT_SIGNING_KEY = 'next-key'
  })

  afterEach(() => {
    for (const k of keys) {
      if (savedEnv[k] === undefined) delete process.env[k]
      else process.env[k] = savedEnv[k]
    }
  })

  it('returns all env vars as object', () => {
    const env = getEnv()
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co')
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('anon-key')
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe('service-role-key')
    expect(env.PORTAL_JWT_SECRET).toBe('secret-32-chars-minimum-padding!!')
    expect(env.QSTASH_CURRENT_SIGNING_KEY).toBe('current-key')
    expect(env.QSTASH_NEXT_SIGNING_KEY).toBe('next-key')
  })

  it('returns undefined for optional keys when not set', () => {
    delete process.env.QSTASH_CURRENT_SIGNING_KEY
    delete process.env.QSTASH_NEXT_SIGNING_KEY
    const env = getEnv()
    expect(env.QSTASH_CURRENT_SIGNING_KEY).toBeUndefined()
    expect(env.QSTASH_NEXT_SIGNING_KEY).toBeUndefined()
  })
})
