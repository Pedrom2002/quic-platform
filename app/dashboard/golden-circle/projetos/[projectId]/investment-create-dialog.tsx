'use client'

import { useState } from 'react'

import type { Investor } from '@/types/database'
import { buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

import { InvestmentForm } from './investment-form'

export function InvestmentCreateDialog({
  projectId,
  approvedInvestors,
}: {
  projectId: string
  approvedInvestors: Pick<Investor, 'id' | 'full_name'>[]
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger className={buttonVariants({})}>Registar investimento</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registar investimento</DialogTitle>
        </DialogHeader>
        <InvestmentForm projectId={projectId} approvedInvestors={approvedInvestors} onSuccess={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
