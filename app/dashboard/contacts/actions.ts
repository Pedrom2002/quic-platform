'use server'

import { createClient } from '@/lib/supabase/server'
import { resolveOrgMember } from '@/lib/supabase/actions'

// Pure visibility helper -- exported for testing
export function isContactVisibleToMember(
  groups: Array<{ admin_only: boolean }>
): boolean {
  if (groups.length === 0) return true
  return groups.some(g => !g.admin_only)
}
