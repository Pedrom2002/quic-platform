'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { createArticleAction } from '@/app/dashboard/events/[eventId]/cliping/actions'

interface Props {
  eventId: string
}

export function AddArticleDialog({ eventId }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setOkMsg(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await createArticleAction(eventId, fd)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setOkMsg(`Artigo adicionado. ${res.notifiedClients} cliente(s) notificado(s).`)
      setOpen(false)
      ;(e.target as HTMLFormElement).reset()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Adicionar artigo
      </button>

      {okMsg && (
        <p className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{okMsg}</p>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Novo artigo</h2>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-xs font-medium text-slate-600 mb-1">Titulo</label>
                <input id="title" name="title" type="text" required maxLength={300}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm" />
              </div>
              <div>
                <label htmlFor="url" className="block text-xs font-medium text-slate-600 mb-1">URL</label>
                <input id="url" name="url" type="url" required placeholder="https://"
                  className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm" />
              </div>
              <div>
                <label htmlFor="source" className="block text-xs font-medium text-slate-600 mb-1">Fonte (opcional)</label>
                <input id="source" name="source" type="text" maxLength={120}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm" />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="h-9 px-4 text-sm rounded-md border border-slate-200 text-slate-600">Cancelar</button>
                <button type="submit" disabled={pending}
                  className="h-9 px-4 text-sm rounded-md bg-slate-900 text-white disabled:opacity-50">
                  {pending ? 'A guardar...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
