import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSendEmail } = vi.hoisted(() => ({ mockSendEmail: vi.fn() }))

vi.mock('@/lib/notifications/channels/email', () => ({ sendEmail: mockSendEmail }))
vi.mock('@/lib/env', () => ({
  getEnv: () => ({ NEXT_PUBLIC_APP_URL: 'https://app.quic.pt' }),
}))

import {
  notifyArtistOfNewItem,
  buildArtistPortalUrl,
  buildArtistNotificationHtml,
} from '@/lib/artists/notify'

const artist = {
  id: 'artist-1',
  name: 'Maria Silva',
  email: 'maria@example.com',
  portal_token: 'aB3kM9nP2qRs1234',
}

beforeEach(() => {
  mockSendEmail.mockReset()
})

describe('buildArtistPortalUrl', () => {
  it('builds portal url from env', () => {
    expect(buildArtistPortalUrl('tok123')).toBe('https://app.quic.pt/artista/tok123')
  })
})

describe('buildArtistNotificationHtml', () => {
  it('escapes html in name and label', () => {
    const html = buildArtistNotificationHtml({
      artistName: '<script>x</script>',
      itemLabel: 'a & b',
      portalUrl: 'https://app.quic.pt/artista/t',
    })
    expect(html).not.toContain('<script>x</script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('a &amp; b')
  })

  it('neutralizes non-http portal url', () => {
    const html = buildArtistNotificationHtml({
      artistName: 'X',
      itemLabel: 'Y',
      portalUrl: 'javascript:alert(1)',
    })
    expect(html).toContain('href="#"')
  })
})

describe('notifyArtistOfNewItem', () => {
  it('sends email and returns true', async () => {
    mockSendEmail.mockResolvedValue('msg-id')
    const sent = await notifyArtistOfNewItem({ artist, itemLabel: 'Novo concerto na agenda' })
    expect(sent).toBe(true)
    expect(mockSendEmail).toHaveBeenCalledOnce()
    const args = mockSendEmail.mock.calls[0][0]
    expect(args.to).toBe('maria@example.com')
    expect(args.html).toContain('/artista/aB3kM9nP2qRs1234')
  })

  it('no-op without email', async () => {
    const sent = await notifyArtistOfNewItem({
      artist: { ...artist, email: null },
      itemLabel: 'X',
    })
    expect(sent).toBe(false)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('no-op without portal_token', async () => {
    const sent = await notifyArtistOfNewItem({
      artist: { ...artist, portal_token: null },
      itemLabel: 'X',
    })
    expect(sent).toBe(false)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('does not throw when sendEmail fails', async () => {
    mockSendEmail.mockRejectedValue(new Error('Brevo 500'))
    const sent = await notifyArtistOfNewItem({ artist, itemLabel: 'X' })
    expect(sent).toBe(false)
  })
})
