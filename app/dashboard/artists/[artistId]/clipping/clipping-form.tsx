'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import type { ArtistClipping } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { createClipping, updateClipping } from '../../content-actions'

export function ClippingForm({
  artistId,
  clipping,
  notifyDefault,
  hasEmail,
  onSuccess,
}: {
  artistId: string
  clipping?: ArtistClipping
  notifyDefault?: boolean
  hasEmail?: boolean
  onSuccess?: () => void
}) {
  const [isPending, startTransition] = useTransition()

  const idPrefix = clipping ? `clipping-${clipping.id}` : 'clipping-new'

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = clipping ? await updateClipping(formData) : await createClipping(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(clipping ? 'Clipping atualizado' : 'Clipping criado')
      onSuccess?.()
    })
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="artist_id" value={artistId} />
      {clipping && <input type="hidden" name="id" value={clipping.id} />}
      {clipping?.image_url && (
        <input type="hidden" name="existing_image_url" value={clipping.image_url} />
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-title`}>Título</Label>
        <Input
          id={`${idPrefix}-title`}
          name="title"
          placeholder="Título do artigo"
          defaultValue={clipping?.title ?? ''}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex min-w-40 flex-1 flex-col gap-2">
          <Label htmlFor={`${idPrefix}-source`}>Fonte</Label>
          <Input
            id={`${idPrefix}-source`}
            name="source"
            placeholder="Ex.: Blitz, Público"
            defaultValue={clipping?.source ?? ''}
          />
        </div>
        <div className="flex min-w-40 flex-1 flex-col gap-2">
          <Label htmlFor={`${idPrefix}-date`}>Data de publicação</Label>
          <Input
            id={`${idPrefix}-date`}
            name="published_at"
            type="date"
            defaultValue={clipping?.published_at ?? ''}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-url`}>Link do artigo</Label>
        <Input
          id={`${idPrefix}-url`}
          name="url"
          type="url"
          placeholder="https://..."
          defaultValue={clipping?.url ?? ''}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-image`}>Screenshot (opcional)</Label>
        <Input
          id={`${idPrefix}-image`}
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
        />
      </div>

      {!clipping && (
        <label className="flex items-center gap-2 text-sm" htmlFor={`${idPrefix}-notify`}>
          <input
            id={`${idPrefix}-notify`}
            type="checkbox"
            name="notify"
            defaultChecked={notifyDefault}
            disabled={!hasEmail}
            className="h-4 w-4 accent-primary"
          />
          Notificar o artista por email
          {!hasEmail && <span className="text-muted-foreground">(sem email definido)</span>}
        </label>
      )}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? 'A guardar...' : clipping ? 'Guardar' : 'Adicionar clipping'}
      </Button>
    </form>
  )
}
