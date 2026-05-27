/**
 * Tests for lib/marketing/* — render, scoring, crypto.
 * These are pure/utility modules with no external service calls.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SCORE_DELTA } from '@/lib/marketing/scoring'
import { renderTemplate, injectTracking } from '@/lib/marketing/render'
import { encryptPassword, decryptPassword } from '@/lib/marketing/crypto'

// ─── lib/marketing/scoring ───────────────────────────────────────────────────

describe('SCORE_DELTA', () => {
  it('exports the expected delta values', () => {
    expect(SCORE_DELTA.opened).toBe(5)
    expect(SCORE_DELTA.clicked).toBe(10)
    expect(SCORE_DELTA.replied).toBe(25)
    expect(SCORE_DELTA.bounced).toBe(-50)
    expect(SCORE_DELTA.unsubscribed).toBe(-100)
  })
})

// ─── lib/marketing/render ────────────────────────────────────────────────────

describe('lib/marketing/render', () => {
  const APP_URL = 'https://app.example.com'
  const SEND_ID = 'send-abc-123'

  describe('renderTemplate', () => {
    it('replaces known variables', () => {
      expect(renderTemplate('Olá {{nome}}!', { nome: 'Maria' })).toBe('Olá Maria!')
    })

    it('replaces missing variables with empty string', () => {
      expect(renderTemplate('Empresa: {{empresa}}', {})).toBe('Empresa: ')
    })

    it('replaces multiple different variables', () => {
      const result = renderTemplate('{{nome}} — {{empresa}} ({{cargo}})', {
        nome: 'Ana',
        empresa: 'ACME',
        cargo: 'CEO',
      })
      expect(result).toBe('Ana — ACME (CEO)')
    })

    it('handles template with no variables', () => {
      expect(renderTemplate('Sem variáveis aqui.', {})).toBe('Sem variáveis aqui.')
    })
  })

  describe('injectTracking — open pixel', () => {
    it('inserts pixel before </body> when tag is present', () => {
      const html = '<html><body>Hello</body></html>'
      const result = injectTracking(html, SEND_ID, APP_URL)
      expect(result).toContain(`${APP_URL}/api/marketing/track/open?sid=${SEND_ID}`)
      const pixelIdx = result.indexOf(`track/open?sid=${SEND_ID}`)
      const bodyCloseIdx = result.indexOf('</body>')
      expect(pixelIdx).toBeLessThan(bodyCloseIdx)
    })

    it('appends pixel when no </body> tag exists', () => {
      const html = 'Plain text email'
      const result = injectTracking(html, SEND_ID, APP_URL)
      expect(result).toContain(`${APP_URL}/api/marketing/track/open?sid=${SEND_ID}`)
    })
  })

  describe('injectTracking — link rewriting', () => {
    it('rewrites https links to click-tracking URL', () => {
      const html = '<a href="https://example.com/page">click</a>'
      const result = injectTracking(html, SEND_ID, APP_URL)
      expect(result).toContain(`${APP_URL}/api/marketing/track/click?sid=${SEND_ID}`)
      expect(result).toContain(encodeURIComponent('https://example.com/page'))
    })

    it('rewrites http links to click-tracking URL', () => {
      const html = '<a href="http://example.com">click</a>'
      const result = injectTracking(html, SEND_ID, APP_URL)
      expect(result).toContain(`${APP_URL}/api/marketing/track/click?sid=${SEND_ID}`)
    })

    it('does NOT rewrite unsubscribe links', () => {
      const unsubUrl = `${APP_URL}/api/marketing/unsubscribe?sid=x`
      const html = `<a href="${unsubUrl}">unsubscribe</a>`
      const result = injectTracking(html, SEND_ID, APP_URL)
      expect(result).toContain(unsubUrl)
      // Must NOT wrap it in click-tracking
      const clickOccurrences = (result.match(/track\/click/g) ?? []).length
      expect(clickOccurrences).toBe(0)
    })
  })

  describe('injectTracking — unsubscribe footer', () => {
    it('inserts footer before </body> when tag is present', () => {
      const html = '<body>content</body>'
      const result = injectTracking(html, SEND_ID, APP_URL)
      expect(result).toContain(`${APP_URL}/api/marketing/unsubscribe?sid=${SEND_ID}`)
      const footerIdx = result.indexOf(`unsubscribe?sid=${SEND_ID}`)
      const bodyCloseIdx = result.indexOf('</body>')
      expect(footerIdx).toBeLessThan(bodyCloseIdx)
    })

    it('appends footer when no </body> tag exists', () => {
      const html = 'no body tag here'
      const result = injectTracking(html, SEND_ID, APP_URL)
      expect(result).toContain(`${APP_URL}/api/marketing/unsubscribe?sid=${SEND_ID}`)
    })
  })
})

// ─── lib/marketing/crypto ────────────────────────────────────────────────────

describe('lib/marketing/crypto', () => {
  // Valid 64-char hex key (256-bit AES)
  const KEY_64 = '0'.repeat(64)
  const origKey = process.env.SMTP_ENCRYPTION_KEY

  beforeEach(() => {
    process.env.SMTP_ENCRYPTION_KEY = KEY_64
  })

  afterEach(() => {
    if (origKey !== undefined) {
      process.env.SMTP_ENCRYPTION_KEY = origKey
    } else {
      delete process.env.SMTP_ENCRYPTION_KEY
    }
  })

  it('round-trips a plain password correctly', () => {
    const plain = 'super-secret-password-123'
    const enc = encryptPassword(plain)
    expect(enc).toContain(':')
    expect(decryptPassword(enc)).toBe(plain)
  })

  it('produces different ciphertext each time (random IV)', () => {
    const enc1 = encryptPassword('password')
    const enc2 = encryptPassword('password')
    expect(enc1).not.toBe(enc2)
  })

  it('throws when SMTP_ENCRYPTION_KEY is absent', () => {
    delete process.env.SMTP_ENCRYPTION_KEY
    expect(() => encryptPassword('test')).toThrow('SMTP_ENCRYPTION_KEY not configured')
  })

  it('throws when SMTP_ENCRYPTION_KEY is too short', () => {
    process.env.SMTP_ENCRYPTION_KEY = 'tooshort'
    expect(() => encryptPassword('test')).toThrow('SMTP_ENCRYPTION_KEY not configured')
  })

  it('throws when decrypting an invalid format (no colon)', () => {
    expect(() => decryptPassword('nocolon')).toThrow('Invalid encrypted password format')
  })
})
