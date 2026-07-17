'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Copy, RefreshCw, Ban, CheckCircle2 } from 'lucide-react'

import type { Artist } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

import {
  regeneratePortalToken,
  revokePortalToken,
  reactivatePortalToken,
  toggleArtistActive,
  inviteArtistToApp,
  type ActionResult,
} from '../actions'

export function PortalLinkCard({
  artist,
  portalUrl,
}: {
  artist: Artist
  portalUrl: string | null
}) {
  const [isPending, startTransition] = useTransition()

  const revoked = Boolean(
    artist.portal_token_expires_at && new Date(artist.portal_token_expires_at) <= new Date()
  )

  function run(
    action: (formData: FormData) => Promise<ActionResult>,
    successMsg: string,
    extra?: Record<string, string>
  ) {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('id', artist.id)
      for (const [key, value] of Object.entries(extra ?? {})) formData.set(key, value)
      const result = await action(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(successMsg)
    })
  }

  async function copyLink() {
    if (!portalUrl) return
    await navigator.clipboard.writeText(portalUrl)
    toast.success('Link copiado')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portal do artista</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {portalUrl ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input readOnly value={portalUrl} className="flex-1 font-mono text-xs" />
            <Button type="button" variant="secondary" size="sm" onClick={copyLink}>
              <Copy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Copiar
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sem link gerado.</p>
        )}

        {revoked && (
          <p className="text-sm text-destructive">
            Link revogado: o artista não consegue aceder até regenerares ou reativares.
          </p>
        )}
        {!artist.is_active && (
          <p className="text-sm text-destructive">
            Artista inativo: o portal está indisponível mesmo com link válido.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => {
              if (confirm('Regenerar o link? O link antigo deixa de funcionar imediatamente.')) {
                run(regeneratePortalToken, 'Link regenerado')
              }
            }}
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Regenerar
          </Button>

          {revoked ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => run(reactivatePortalToken, 'Link reativado')}
            >
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Reativar
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => {
                if (confirm('Revogar o acesso do artista ao portal?')) {
                  run(revokePortalToken, 'Link revogado')
                }
              }}
            >
              <Ban className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Revogar
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() =>
              run(
                toggleArtistActive,
                artist.is_active ? 'Artista desativado' : 'Artista ativado',
                { is_active: artist.is_active ? 'false' : 'true' }
              )
            }
          >
            {artist.is_active ? 'Desativar artista' : 'Ativar artista'}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending || Boolean(artist.auth_user_id) || !artist.email}
            onClick={() => run(inviteArtistToApp, 'Convite enviado')}
          >
            {artist.auth_user_id ? 'Já convidado' : 'Convidar para app'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
