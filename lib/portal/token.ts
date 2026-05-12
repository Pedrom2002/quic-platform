import { SignJWT, jwtVerify, errors } from 'jose'
import { getEnv } from '@/lib/env'
import type { PortalTokenPayload } from '@/types/app'

function getSecret(): Uint8Array {
  return new TextEncoder().encode(getEnv().PORTAL_JWT_SECRET)
}

export async function signPortalToken(eventId: string): Promise<string> {
  return new SignJWT({ eventId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(getSecret())
}

export async function verifyPortalToken(token: string): Promise<PortalTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as PortalTokenPayload
  } catch (err) {
    // Tokens antigos foram emitidos com expiração; o controlo de acesso é feito
    // via portal_token_revoked_at na base de dados, por isso aceitamos igualmente.
    if (err instanceof errors.JWTExpired) {
      return err.payload as unknown as PortalTokenPayload
    }
    return null
  }
}
