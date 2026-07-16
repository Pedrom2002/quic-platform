'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

import type { ArtistAsset } from '@/types/database'
import { Button } from '@/components/ui/button'

import { deleteAsset } from '../content-actions'

export function AssetDeleteButton({ asset }: { asset: ArtistAsset }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Apagar "${asset.title}"?`)) return
    startTransition(async () => {
      const formData = new FormData()
      formData.set('id', asset.id)
      formData.set('artist_id', asset.artist_id)
      formData.set('section', asset.section)
      const result = await deleteAsset(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Apagado')
    })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      aria-label="Apagar"
      onClick={handleDelete}
    >
      <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
    </Button>
  )
}
