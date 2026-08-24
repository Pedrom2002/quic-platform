'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

import { InvestmentEditForm, type EditableInvestment } from './investment-edit-form'

export function InvestmentEditDialog({
  projectId,
  investment,
}: {
  projectId: string
  investment: EditableInvestment
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>
        <Button variant="outline" size="sm">Editar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar investimento</DialogTitle>
        </DialogHeader>
        <InvestmentEditForm projectId={projectId} investment={investment} onSuccess={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
