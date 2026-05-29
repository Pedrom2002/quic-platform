import nodemailer from 'nodemailer'
import { decryptPassword } from './crypto'

export interface SmtpCredentials {
  host: string
  port: number
  username: string
  password_enc: string
  from_name: string
}

export interface SendMailParams {
  credentials: SmtpCredentials
  to: string
  subject: string
  html: string
  unsubscribeUrl?: string
  replyTo?: string
}

function createTransport(creds: SmtpCredentials) {
  return nodemailer.createTransport({
    host: creds.host,
    port: creds.port,
    secure: creds.port === 465,
    auth: {
      user: creds.username,
      pass: decryptPassword(creds.password_enc),
    },
  })
}

export async function sendMarketingEmail({ credentials, to, subject, html, unsubscribeUrl, replyTo }: SendMailParams): Promise<string> {
  const transport = createTransport(credentials)
  const headers: Record<string, string> = {}
  if (unsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${unsubscribeUrl}>`
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
  }
  const info = await transport.sendMail({
    from: `"${credentials.from_name}" <${credentials.username}>`,
    to,
    subject,
    html,
    replyTo: replyTo ?? credentials.username,
    headers,
  })
  return info.messageId ?? ''
}

export async function testSmtpConnection(credentials: SmtpCredentials): Promise<void> {
  const transport = createTransport(credentials)
  await transport.verify()
}
