'use client'

import { useState, useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { regeneratePortalTokenAction } from '@/app/dashboard/events/[eventId]/actions'

interface Props {
  eventId: string
}

export function RegeneratePortalButton({ eventId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [confirmed, setConfirmed] = useState(false)

  function handleClick() {
    if (!confirmed) {
      setConfirmed(true)
      setTimeout(() => setConfirmed(false), 3000)
      return
    }
    startTransition(async () => {
      try {
        await regeneratePortalTokenAction(eventId)
        toast.success('Link do portal regenerado')
        setConfirmed(false)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao regenerar link')
        setConfirmed(false)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      title="Regenerar link do portal"
      className={`inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium rounded-lg border transition-colors ${
        confirmed
          ? 'border-orange-300 bg-orange-50 text-orange-600 hover:bg-orange-100'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
      {confirmed ? 'Confirmar?' : 'Regenerar link'}
    </button>
  )
}
