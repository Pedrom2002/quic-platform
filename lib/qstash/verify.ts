import { Receiver } from '@upstash/qstash'

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
})

export async function verifyQStashSignature(req: Request): Promise<boolean> {
  const signature = req.headers.get('upstash-signature')
  if (!signature) return false

  const body = await req.text()

  try {
    await receiver.verify({ signature, body })
    return true
  } catch {
    return false
  }
}
