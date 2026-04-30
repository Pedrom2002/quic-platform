import { createClient } from '@supabase/supabase-js'

// Cliente com service_role — ignora RLS
// Usar APENAS em Route Handlers server-side e workers
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
