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

import { EventForm } from './event-form'

export function EventCreateDialog() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger className={buttonVariants({})}>Novo evento</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo evento</DialogTitle>
          <DialogDescription>
            Crie um evento para associar saídas e devoluções de material.
          </DialogDescription>
        </DialogHeader>
        <EventForm onSuccess={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
