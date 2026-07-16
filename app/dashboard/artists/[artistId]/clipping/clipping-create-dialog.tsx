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

import { ClippingForm } from './clipping-form'

export function ClippingCreateDialog({
  artistId,
  notifyDefault,
  hasEmail,
}: {
  artistId: string
  notifyDefault: boolean
  hasEmail: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger className={buttonVariants({})}>Novo clipping</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo clipping</DialogTitle>
          <DialogDescription>Artigo publicado sobre o artista.</DialogDescription>
        </DialogHeader>
        <ClippingForm
          artistId={artistId}
          notifyDefault={notifyDefault}
          hasEmail={hasEmail}
          onSuccess={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
