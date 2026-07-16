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

import { ArtistForm } from './artist-form'

export function ArtistCreateDialog() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger className={buttonVariants({})}>Novo artista</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo artista</DialogTitle>
          <DialogDescription>
            O link do portal é gerado automaticamente ao criar.
          </DialogDescription>
        </DialogHeader>
        <ArtistForm onSuccess={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
