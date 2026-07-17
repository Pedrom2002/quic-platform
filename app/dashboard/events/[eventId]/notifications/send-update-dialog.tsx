'use client'

import { useState, useTransition } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { sendClientUpdateAction } from './actions'

export function SendUpdateDialog({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSend() {
    if (!message.trim()) {
      toast.error('Escreva uma mensagem')
      return
    }
    startTransition(async () => {
      try {
        const { sent } = await sendClientUpdateAction(eventId, message)
        toast.success(sent > 0 ? `Mensagem enviada a ${sent} destinatário(s)` : 'Nenhum destinatário elegível para receber a mensagem')
        setMessage('')
        setOpen(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao enviar mensagem')
      }
    })
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Send className="w-4 h-4" /> Enviar atualização
      </Button>

      <Dialog open={open} onOpenChange={v => { if (!isPending) setOpen(v) }}>
        <DialogContent className="bg-white border-slate-200 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Enviar atualização aos clientes</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Escreva a mensagem a enviar por email, SMS e portal..."
              rows={5}
              maxLength={2000}
              disabled={isPending}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button onClick={handleSend} disabled={isPending || !message.trim()}>
                {isPending ? 'A enviar...' : 'Enviar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
