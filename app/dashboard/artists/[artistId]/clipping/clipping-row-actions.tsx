'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'

import type { ArtistClipping } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import { deleteClipping } from '../../content-actions'
import { ClippingForm } from './clipping-form'

export function ClippingRowActions({ clipping }: { clipping: ArtistClipping }) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Apagar "${clipping.title}"?`)) return
    startTransition(async () => {
      const formData = new FormData()
      formData.set('id', clipping.id)
      formData.set('artist_id', clipping.artist_id)
      const result = await deleteClipping(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Clipping apagado')
    })
  }

  return (
    <div className="flex justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Editar"
        onClick={() => setIsEditOpen(true)}
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
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

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar clipping</DialogTitle>
          </DialogHeader>
          <ClippingForm
            artistId={clipping.artist_id}
            clipping={clipping}
            onSuccess={() => setIsEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
