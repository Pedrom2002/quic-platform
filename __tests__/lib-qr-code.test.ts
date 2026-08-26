import { describe, it, expect } from 'vitest'
import { buildQrCodeSrc } from '@/lib/qr-code'

describe('buildQrCodeSrc', () => {
  it('builds a URL with the default size', () => {
    const src = buildQrCodeSrc('ticket-abc-123')
    expect(src).toBe('https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=ticket-abc-123')
  })

  it('honors a custom size', () => {
    const src = buildQrCodeSrc('ticket-abc-123', 400)
    expect(src).toContain('size=400x400')
  })

  it('URL-encodes special characters in the data', () => {
    const src = buildQrCodeSrc('a b&c=d')
    expect(src).toContain('data=a%20b%26c%3Dd')
  })
})
