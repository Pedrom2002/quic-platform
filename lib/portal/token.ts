import { SignJWT, jwtVerify } from 'jose'
import type { PortalTokenPayload } from '@/types/app'

const secret = new TextEncoder().encode(process.env.PORTAL_JWT_SECRET!)

const EXPIRY_DAYS = 90

export async function signPortalToken(eventId: string): Promise<string> {
  return new SignJWT({ eventId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_DAYS}d`)
    .sign(secret)
}

export async function verifyPortalToken(token: string): Promise<PortalTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as PortalTokenPayload
  } catch {
    return null
  }
}
