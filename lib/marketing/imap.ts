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

export interface ReplyInfo {
  inReplyTo: string
  references: string[]
  fromEmail: string
  snippet: string
  receivedAt: Date
}

const BOUNCE_SENDERS = ['mailer-daemon', 'postmaster']
const BOUNCE_SUBJECTS = ['delivery status', 'undeliverable', 'mail delivery failed', 'returned mail']

function createImapClient(creds: ImapCredentials): ImapFlow {
  return new ImapFlow({
    host: creds.host,
    port: 993,
    secure: true,
    auth: { user: creds.username, pass: decryptPassword(creds.password_enc) },
    logger: false,
  })
}

export async function pollBounces(creds: ImapCredentials, since: Date): Promise<BounceInfo[]> {
  const client = createImapClient(creds)
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

export async function pollReplies(creds: ImapCredentials, since: Date): Promise<ReplyInfo[]> {
  const client = createImapClient(creds)
  const replies: ReplyInfo[] = []

  await client.connect()
  try {
    await client.mailboxOpen('INBOX')
    const sinceStr = since.toISOString().split('T')[0]

    for await (const msg of client.fetch(`SINCE ${sinceStr}`, {
      envelope: true,
      headers: ['in-reply-to', 'references'],
      source: true,
    })) {
      if (!msg.envelope) continue

      const from = msg.envelope.from?.[0]?.address?.toLowerCase() ?? ''
      if (!from) continue

      const subjectLower = msg.envelope.subject?.toLowerCase() ?? ''
      if (BOUNCE_SENDERS.some(s => from.includes(s))) continue
      if (BOUNCE_SUBJECTS.some(s => subjectLower.includes(s))) continue

      const headersStr = msg.headers?.toString() ?? ''
      const headers = parseHeaders(headersStr)
      const inReplyTo = (headers['in-reply-to'] ?? '').trim().replace(/[<>]/g, '')
      const refsRaw = (headers['references'] ?? '').trim()
      const references = refsRaw
        .split(/\s+/)
        .map(r => r.replace(/[<>]/g, '').trim())
        .filter(Boolean)

      if (!inReplyTo && references.length === 0) continue

      const snippet = extractSnippet(msg.source?.toString() ?? '')

      replies.push({
        inReplyTo,
        references,
        fromEmail: from,
        snippet,
        receivedAt: msg.envelope.date ?? new Date(),
      })
    }
  } finally {
    await client.logout()
  }

  return replies
}

function parseHeaders(raw: string): Record<string, string> {
  const out: Record<string, string> = {}
  const lines = raw.split(/\r?\n/)
  let currentKey = ''
  for (const line of lines) {
    if (/^\s/.test(line) && currentKey) {
      out[currentKey] = (out[currentKey] ?? '') + ' ' + line.trim()
    } else {
      const m = line.match(/^([^:]+):\s*(.*)$/)
      if (m) {
        currentKey = m[1].toLowerCase()
        out[currentKey] = m[2]
      }
    }
  }
  return out
}

function extractSnippet(rawSource: string): string {
  const blankIdx = rawSource.indexOf('\r\n\r\n')
  const body = blankIdx >= 0 ? rawSource.slice(blankIdx + 4) : rawSource
  const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.slice(0, 200)
}

function extractEmailFromBounce(rawSubject: string): string | null {
  const match = rawSubject.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)
  return match ? match[0].toLowerCase() : null
}
