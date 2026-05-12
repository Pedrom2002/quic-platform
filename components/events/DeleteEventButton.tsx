'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { deleteEventAction } from '@/app/dashboard/events/[eventId]/edit/actions'

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    try {
      await deleteEventAction(eventId)
      toast.success('Evento eliminado')
      router.push('/dashboard/events')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao eliminar evento')
      setLoading(false)
      setOpen(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Eliminar
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white border-slate-200 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Eliminar evento?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 mt-1">
            Esta ação é irreversível. O evento e todos os seus dados serão permanentemente eliminados.
          </p>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? 'A eliminar...' : 'Eliminar definitivamente'}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
