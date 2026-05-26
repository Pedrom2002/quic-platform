import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALG = 'aes-256-cbc'

function getKey(): Buffer {
  const hex = process.env.SMTP_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) throw new Error('SMTP_ENCRYPTION_KEY not configured (64 hex chars required)')
  return Buffer.from(hex, 'hex')
}

export function encryptPassword(plain: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALG, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decryptPassword(enc: string): string {
  const [ivHex, dataHex] = enc.split(':')
  if (!ivHex || !dataHex) throw new Error('Invalid encrypted password format')
  const iv = Buffer.from(ivHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')
  const decipher = createDecipheriv(ALG, getKey(), iv)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
