'use client'

import { useState } from 'react'

import type { ArtistAssetSection } from '@/types/app'
import { buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

import { AssetForm } from './asset-form'

export function AssetCreateDialog({
  artistId,
  section,
  notifyDefault,
  hasEmail,
}: {
  artistId: string
  section: ArtistAssetSection
  notifyDefault: boolean
  hasEmail: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const isContent = section === 'content'

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger className={buttonVariants({})}>
        {isContent ? 'Novo conteúdo' : 'Novo documento'}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isContent ? 'Novo conteúdo' : 'Novo documento'}</DialogTitle>
          <DialogDescription>
            {isContent
              ? 'Fotos, vídeos e artes partilhados com o artista.'
              : 'Contratos, riders, press kits e faturas.'}
          </DialogDescription>
        </DialogHeader>
        <AssetForm
          artistId={artistId}
          section={section}
          notifyDefault={notifyDefault}
          hasEmail={hasEmail}
          onSuccess={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
