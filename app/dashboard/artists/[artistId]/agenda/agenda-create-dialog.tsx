'use client'

import { useState } from 'react'

import { buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

import { AgendaForm } from './agenda-form'

export function AgendaCreateDialog({
  artistId,
  events,
  notifyDefault,
  hasEmail,
}: {
  artistId: string
  events: { id: string; name: string }[]
  notifyDefault: boolean
  hasEmail: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger className={buttonVariants({})}>Novo item</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo item de agenda</DialogTitle>
          <DialogDescription>
            Itens visíveis aparecem no portal do artista.
          </DialogDescription>
        </DialogHeader>
        <AgendaForm
          artistId={artistId}
          events={events}
          notifyDefault={notifyDefault}
          hasEmail={hasEmail}
          onSuccess={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
