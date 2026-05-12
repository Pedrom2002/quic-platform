import { randomBytes } from 'node:crypto'

// Generates a short URL-safe token for the client portal.
// 12 random bytes → 16 base64url chars, e.g. "aB3kM9nP2qRs1234"
export async function signPortalToken(_eventId: string): Promise<string> {
  return randomBytes(12).toString('base64url')
}
