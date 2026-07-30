import { createClient } from '@supabase/supabase-js'
import { getEnv } from '@/lib/env'
import type { Database } from '@/types/database'

// Cliente com service_role — ignora RLS.
// Usar APENAS em Route Handlers server-side e workers; nunca em componentes cliente.
export function createAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getEnv()
  return createClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
