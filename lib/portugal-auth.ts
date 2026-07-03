import { timingSafeEqual } from 'node:crypto'
import { getEnv } from '@/lib/env'

export function isValidAdminToken(header: string | null): boolean {
  if (!header) return false
  let secret: string
  try {
    secret = getEnv().PORTUGAL_ADMIN_PASSWORD!
  } catch {
    return false
  }
  try {
    const a = Buffer.from(header)
    const b = Buffer.from(secret)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}
