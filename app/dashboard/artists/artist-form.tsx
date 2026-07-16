'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import type { Artist } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { createArtist, updateArtist } from './actions'

export function ArtistForm({
  artist,
  onSuccess,
}: {
  artist?: Artist
  onSuccess?: () => void
}) {
  const [isPending, startTransition] = useTransition()

  const idPrefix = artist ? `artist-${artist.id}` : 'artist-new'

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = artist ? await updateArtist(formData) : await createArtist(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(artist ? 'Artista atualizado' : 'Artista criado')
      onSuccess?.()
    })
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      {artist && <input type="hidden" name="id" value={artist.id} />}

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-name`}>Nome</Label>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          placeholder="Nome artístico"
          defaultValue={artist?.name ?? ''}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <Label htmlFor={`${idPrefix}-email`}>Email</Label>
          <Input
            id={`${idPrefix}-email`}
            name="email"
            type="email"
            placeholder="Para notificações do portal (opcional)"
            defaultValue={artist?.email ?? ''}
          />
        </div>
        <div className="flex min-w-36 flex-1 flex-col gap-2">
          <Label htmlFor={`${idPrefix}-phone`}>Telefone</Label>
          <Input
            id={`${idPrefix}-phone`}
            name="phone"
            placeholder="Opcional"
            defaultValue={artist?.phone ?? ''}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-bio`}>Bio</Label>
        <Textarea
          id={`${idPrefix}-bio`}
          name="bio"
          rows={3}
          placeholder="Curta apresentação mostrada no portal (opcional)"
          defaultValue={artist?.bio ?? ''}
        />
      </div>

      <label className="flex items-center gap-2 text-sm" htmlFor={`${idPrefix}-notify`}>
        <input
          id={`${idPrefix}-notify`}
          type="checkbox"
          name="notify_on_publish"
          defaultChecked={artist?.notify_on_publish ?? true}
          className="h-4 w-4 accent-primary"
        />
        Notificar por email quando publicamos novidades
      </label>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? 'A guardar...' : artist ? 'Guardar' : 'Criar artista'}
      </Button>
    </form>
  )
}
