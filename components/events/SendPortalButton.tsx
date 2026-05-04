'use client'

import { useState, useTransition } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { sendPortalLinkAction } from '@/app/dashboard/events/[eventId]/actions'

interface Props {
  eventId: string
}

export function SendPortalButton({ eventId }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function send() {
    startTransition(async () => {
      try {
        await sendPortalLinkAction(eventId)
        toast.success('Link do portal enviado por email')
        setOpen(false)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao enviar email')
      }
    })
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Send className="w-3.5 h-3.5 mr-1.5" />
        Enviar portal
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white border-slate-200 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Enviar link do portal</DialogTitle>
          </DialogHeader>
          <p className="text-slate-500 text-sm mt-1">
            Será enviado um email com o link do portal a todos os clientes deste evento que têm email configurado.
          </p>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1" disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={send} disabled={isPending} className="flex-1">
              {isPending ? 'A enviar...' : 'Confirmar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
