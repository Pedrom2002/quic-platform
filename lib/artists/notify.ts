import { sendEmail } from '@/lib/notifications/channels/email'
import { getEnv } from '@/lib/env'
import { createLogger } from '@/lib/logger'

const log = createLogger('artists.notify')

interface NotifiableArtist {
  id: string
  name: string
  email: string | null
  portal_token: string | null
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function buildArtistPortalUrl(portalToken: string): string {
  const base = getEnv().NEXT_PUBLIC_APP_URL ?? ''
  return `${base.replace(/\/$/, '')}/artista/${portalToken}`
}

export function buildArtistNotificationHtml(params: {
  artistName: string
  itemLabel: string
  portalUrl: string
}): string {
  const name = escapeHtml(params.artistName)
  const label = escapeHtml(params.itemLabel)
  const url = /^https?:\/\//.test(params.portalUrl) ? params.portalUrl.replace(/"/g, '%22') : '#'

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Novidades no teu portal</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f4f5;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:580px;background:#ffffff;border-radius:12px;padding:32px" cellpadding="0" cellspacing="0" role="presentation">
        <tr><td>
          <p style="margin:0 0 16px;font-size:16px;color:#18181b">Olá ${name},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#3f3f46">Há novidades no teu portal: <strong>${label}</strong>.</p>
          <p style="margin:0 0 24px">
            <a href="${url}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px">Abrir o meu portal</a>
          </p>
          <p style="margin:0;font-size:13px;color:#a1a1aa">Este link é pessoal, não o partilhes.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// Nunca lança nem bloqueia a mutação que a invoca; falhas ficam no log.
export async function notifyArtistOfNewItem(params: {
  artist: NotifiableArtist
  itemLabel: string
}): Promise<boolean> {
  const { artist, itemLabel } = params
  if (!artist.email || !artist.portal_token) return false

  try {
    await sendEmail({
      to: artist.email,
      toName: artist.name,
      subject: 'Novidades no teu portal',
      html: buildArtistNotificationHtml({
        artistName: artist.name,
        itemLabel,
        portalUrl: buildArtistPortalUrl(artist.portal_token),
      }),
    })
    return true
  } catch (err) {
    log.error('Falha ao notificar artista', {
      artistId: artist.id,
      error: err instanceof Error ? err.message : String(err),
    })
    return false
  }
}
