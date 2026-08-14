// MX-record check for signup emails, catches typo/garbage domains (e.g. test@test.com,
// asdf@asdf.com) that zod's format-only validation lets through and that later hard-bounce,
// which is what puts Supabase's shared SMTP sending privileges at risk.

import { resolveMx } from 'node:dns/promises'

const mxCache = new Map<string, { ok: boolean; expiresAt: number }>()
const CACHE_TTL_MS = 10 * 60 * 1_000
const LOOKUP_TIMEOUT_MS = 2_000

/**
 * Resolves true if the email's domain has at least one MX record.
 * Fails open (returns true) on lookup timeout/error so transient DNS issues
 * never block a legitimate signup.
 */
export async function hasValidMxRecord(email: string): Promise<boolean> {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false

  const cached = mxCache.get(domain)
  if (cached && cached.expiresAt > Date.now()) return cached.ok

  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('mx-lookup-timeout')), LOOKUP_TIMEOUT_MS)
      ),
    ])
    const ok = records.length > 0
    mxCache.set(domain, { ok, expiresAt: Date.now() + CACHE_TTL_MS })
    return ok
  } catch {
    return true
  }
}
