'use client'

import { useState } from 'react'

import type { Investor, InvestmentProject } from '@/types/database'
import { buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

import { DocumentForm } from './document-form'

export function DocumentCreateDialog({
  investors,
  projects,
}: {
  investors: Pick<Investor, 'id' | 'full_name'>[]
  projects: Pick<InvestmentProject, 'id' | 'name'>[]
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger className={buttonVariants({})}>Adicionar documento</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar documento</DialogTitle>
        </DialogHeader>
        <DocumentForm investors={investors} projects={projects} onSuccess={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
