import { describe, it, expect, jest } from '@jest/globals'

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn((url: string, key: string, opts: unknown) => ({ url, key, opts })),
}))

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {},
}))

describe('supabase client', () => {
  it('creates client with env vars and AsyncStorage persistence', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'

    jest.isolateModules(() => {
      const { createClient } = require('@supabase/supabase-js')
      const { supabase } = require('./supabase')
      expect(createClient).toHaveBeenCalledWith(
        'https://example.supabase.co',
        'anon-key',
        expect.objectContaining({
          auth: expect.objectContaining({
            persistSession: true,
            autoRefreshToken: true,
          }),
        })
      )
      expect(supabase).toBeDefined()
    })
  })
})
