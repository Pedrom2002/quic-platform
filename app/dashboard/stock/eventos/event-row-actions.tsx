'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import type { StockEvent } from '@/lib/stock/types'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

import { deleteEvent } from './actions'
import { EventForm } from './event-form'

export function EventRowActions({ event }: { event: StockEvent }) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (
      !confirm(
        `Apagar o evento "${event.name}"? Movimentos ficam sem evento associado.`
      )
    ) {
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.set('id', event.id)
      const result = await deleteEvent(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Evento apagado')
    })
  }

  return (
    <div className="flex justify-end gap-2">
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogTrigger className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Editar
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar evento</DialogTitle>
            <DialogDescription>
              Altere os dados do evento &quot;{event.name}&quot;.
            </DialogDescription>
          </DialogHeader>
          <EventForm event={event} onSuccess={() => setIsEditOpen(false)} />
        </DialogContent>
      </Dialog>
      <Button
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={handleDelete}
      >
        Apagar
      </Button>
    </div>
  )
}
