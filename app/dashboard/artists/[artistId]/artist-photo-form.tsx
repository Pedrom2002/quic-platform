'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import type { Artist } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { updateArtistPhoto } from '../actions'

export function ArtistPhotoForm({ artist }: { artist: Artist }) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateArtistPhoto(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Foto atualizada')
    })
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap items-center gap-4">
      <input type="hidden" name="id" value={artist.id} />
      {artist.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={artist.photo_url}
          alt={artist.name}
          className="h-16 w-16 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-lg font-semibold">
          {artist.name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <Input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/gif" className="max-w-64" />
        <Button type="submit" disabled={isPending} variant="secondary">
          {isPending ? 'A enviar...' : 'Guardar foto'}
        </Button>
      </div>
    </form>
  )
}
