import { ImapFlow } from 'imapflow'
import { decryptPassword } from './crypto'

export interface ImapCredentials {
  host: string
  username: string
  password_enc: string
}

export interface BounceInfo {
  bouncedEmail: string
  rawSubject: string
}

const BOUNCE_SENDERS = ['mailer-daemon', 'postmaster']
const BOUNCE_SUBJECTS = ['delivery status', 'undeliverable', 'mail delivery failed', 'returned mail']

export async function pollBounces(creds: ImapCredentials, since: Date): Promise<BounceInfo[]> {
  const client = new ImapFlow({
    host: creds.host,
    port: 993,
    secure: true,
    auth: { user: creds.username, pass: decryptPassword(creds.password_enc) },
    logger: false,
  })

  const bounces: BounceInfo[] = []

  await client.connect()
  try {
    await client.mailboxOpen('INBOX')
    const sinceStr = since.toISOString().split('T')[0]

    for await (const msg of client.fetch(`SINCE ${sinceStr}`, { envelope: true })) {
      if (!msg.envelope) continue
      const from = msg.envelope.from?.[0]?.address?.toLowerCase() ?? ''
      const subject = msg.envelope.subject?.toLowerCase() ?? ''

      const isBounce =
        BOUNCE_SENDERS.some(s => from.includes(s)) ||
        BOUNCE_SUBJECTS.some(s => subject.includes(s))

      if (!isBounce) continue

      const originalEmail = extractEmailFromBounce(msg.envelope.subject ?? '')
      if (originalEmail) {
        bounces.push({ bouncedEmail: originalEmail, rawSubject: msg.envelope.subject ?? '' })
      }
    }
  } finally {
    await client.logout()
  }

  return bounces
}

function extractEmailFromBounce(rawSubject: string): string | null {
  const match = rawSubject.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)
  return match ? match[0].toLowerCase() : null
}
