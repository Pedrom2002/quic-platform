import { describe, it, expect } from 'vitest'
import { buildEmailHtml } from '@/lib/notifications/channels/email'

describe('buildEmailHtml', () => {
  it('returns a valid HTML document', () => {
    const html = buildEmailHtml('Olá cliente.', 'Concerto 2026')
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Olá cliente.')
    expect(html).toContain('Concerto 2026')
  })

  it('renders a CTA button for https URLs', () => {
    const html = buildEmailHtml('https://quic.pt/portal/abc123', 'Evento')
    expect(html).toContain('href="https://quic.pt/portal/abc123"')
    expect(html).toContain('Ver portal do evento')
  })

  it('renders a CTA button for http URLs', () => {
    const html = buildEmailHtml('http://localhost:3000/portal/abc', 'Evento')
    expect(html).toContain('href="http://localhost:3000/portal/abc"')
  })

  it('does NOT render a CTA button for javascript: URLs', () => {
    const html = buildEmailHtml('javascript:alert(1)', 'Evento')
    expect(html).not.toContain('href="javascript:')
    expect(html).not.toContain('Ver portal do evento')
  })

  it('does NOT render a CTA button for data: URLs', () => {
    const html = buildEmailHtml('data:text/html,<script>alert(1)</script>', 'Evento')
    expect(html).not.toContain('href="data:')
    expect(html).not.toContain('Ver portal do evento')
  })

  it('escapes HTML entities in body text', () => {
    const html = buildEmailHtml('A & B < C > D', 'Evento')
    expect(html).toContain('A &amp; B &lt; C &gt; D')
    expect(html).not.toContain('<C>')
  })

  it('renders progress bar when progressPercent is provided', () => {
    const html = buildEmailHtml('Texto.', 'Evento', 60)
    expect(html).toContain('60%')
    expect(html).toContain('Progresso do evento')
  })

  it('omits progress bar when progressPercent is undefined', () => {
    const html = buildEmailHtml('Texto.', 'Evento')
    expect(html).not.toContain('Progresso do evento')
  })

  it('renders bold text from **markers**', () => {
    const html = buildEmailHtml('Isto é **importante**.', 'Evento')
    expect(html).toContain('<strong>importante</strong>')
  })

  it('escapes eventName to prevent XSS', () => {
    const html = buildEmailHtml('texto', '<script>alert(1)</script>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
