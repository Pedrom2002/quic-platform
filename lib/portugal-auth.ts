import { timingSafeEqual } from 'node:crypto'

export function isValidAdminToken(header: string | null): boolean {
  const secret = process.env.PORTUGAL_ADMIN_PASSWORD
  if (!secret || !header) return false
  try {
    const a = Buffer.from(header)
    const b = Buffer.from(secret)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}
