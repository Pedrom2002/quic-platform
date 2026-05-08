import { createClient } from '@supabase/supabase-js'
import { getEnv } from '@/lib/env'

// Cliente com service_role — ignora RLS.
// Usar APENAS em Route Handlers server-side e workers; nunca em componentes cliente.
export function createAdminClient() {
  const env = getEnv()
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
