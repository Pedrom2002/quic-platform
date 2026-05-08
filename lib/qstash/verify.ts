import { Receiver } from '@upstash/qstash'
import { getEnv } from '@/lib/env'

export async function verifyQStashSignature(req: Request): Promise<boolean> {
  const signature = req.headers.get('upstash-signature')
  if (!signature) return false

  const env = getEnv()
  if (!env.QSTASH_CURRENT_SIGNING_KEY || !env.QSTASH_NEXT_SIGNING_KEY) {
    console.error('[qstash] QSTASH_CURRENT_SIGNING_KEY / QSTASH_NEXT_SIGNING_KEY not configured')
    return false
  }

  const receiver = new Receiver({
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
  })

  const body = await req.text()

  try {
    await receiver.verify({ signature, body })
    return true
  } catch {
    return false
  }
}
