import { SignJWT, jwtVerify } from 'jose'
import { getEnv } from '@/lib/env'
import type { PortalTokenPayload } from '@/types/app'

function getSecret(): Uint8Array {
  return new TextEncoder().encode(getEnv().PORTAL_JWT_SECRET)
}

const EXPIRY_DAYS = 14

export async function signPortalToken(eventId: string): Promise<string> {
  return new SignJWT({ eventId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_DAYS}d`)
    .sign(getSecret())
}

export async function verifyPortalToken(token: string): Promise<PortalTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as PortalTokenPayload
  } catch {
    return null
  }
}
