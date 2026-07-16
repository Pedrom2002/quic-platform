'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2, Eye, EyeOff } from 'lucide-react'

import type { ArtistAgendaItem } from '@/types/database'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { deleteAgendaItem, toggleAgendaVisibility } from '../../content-actions'
import { AgendaForm } from './agenda-form'

export function AgendaRowActions({
  item,
  events,
}: {
  item: ArtistAgendaItem
  events: { id: string; name: string }[]
}) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function run(action: (fd: FormData) => Promise<{ error?: string }>, successMsg: string, extra?: Record<string, string>) {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('id', item.id)
      formData.set('artist_id', item.artist_id)
      for (const [key, value] of Object.entries(extra ?? {})) formData.set(key, value)
      const result = await action(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(successMsg)
    })
  }

  return (
    <div className="flex justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isPending}
        aria-label={item.is_visible ? 'Ocultar do portal' : 'Mostrar no portal'}
        onClick={() =>
          run(
            toggleAgendaVisibility,
            item.is_visible ? 'Item ocultado do portal' : 'Item visível no portal',
            { is_visible: item.is_visible ? 'false' : 'true' }
          )
        }
      >
        {item.is_visible ? (
          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </Button>

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
        onClick={() => {
          if (confirm(`Apagar "${item.title}" da agenda?`)) {
            run(deleteAgendaItem, 'Item apagado')
          }
        }}
      >
        <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
      </Button>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar item</DialogTitle>
          </DialogHeader>
          <AgendaForm
            artistId={item.artist_id}
            item={item}
            events={events}
            onSuccess={() => setIsEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
