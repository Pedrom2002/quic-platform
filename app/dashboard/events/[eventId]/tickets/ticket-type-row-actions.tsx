'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'

import { toggleTicketTypeActive } from './actions'

type TicketType = Database['public']['Tables']['ticket_types']['Row']

export function TicketTypeRowActions({ eventId, ticketType }: { eventId: string; ticketType: TicketType }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('id', ticketType.id)
      formData.set('is_active', ticketType.is_active ? 'false' : 'true')
      const result = await toggleTicketTypeActive(eventId, formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(ticketType.is_active ? 'Desativado' : 'Ativado')
      router.refresh()
    })
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleToggle}>
      {ticketType.is_active ? 'Desativar' : 'Ativar'}
    </Button>
  )
}
