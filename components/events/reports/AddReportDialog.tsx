'use client'

import { useState, useTransition, useRef } from 'react'
import { Plus } from 'lucide-react'
import { put } from '@vercel/blob'
import { createReportAction } from '@/app/dashboard/events/[eventId]/reports/actions'

interface Props {
  eventId: string
}

export function AddReportDialog({ eventId }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setOkMsg(null)

    const form = e.currentTarget
    const title = (form.elements.namedItem('title') as HTMLInputElement).value
    const type = (form.elements.namedItem('type') as HTMLSelectElement).value
    const fileInput = form.elements.namedItem('file') as HTMLInputElement
    const file = fileInput.files?.[0]

    if (!file) {
      setError('Seleciona um ficheiro')
      return
    }

    startTransition(async () => {
      try {
        const tokenRes = await fetch(
          `/api/events/${eventId}/files/token?filename=${encodeURIComponent(file.name)}&mimeType=${encodeURIComponent(file.type)}`
        )
        if (!tokenRes.ok) {
          const j = await tokenRes.json().catch(() => ({}))
          setError((j as { error?: string }).error ?? 'Erro ao iniciar upload')
          return
        }
        const { token, pathname } = await tokenRes.json() as { token: string; pathname: string }

        const blob = await put(pathname, file, { access: 'public', token, multipart: true })

        const fd = new FormData()
        fd.set('title', title)
        fd.set('type', type)
        fd.set('file_name', file.name)
        fd.set('file_size', String(file.size))
        fd.set('mime_type', file.type)
        fd.set('blob_url', blob.url)
        fd.set('blob_pathname', blob.pathname)

        const res = await createReportAction(eventId, fd)
        if (!res.ok) {
          setError(res.error)
          return
        }

        setOkMsg('Relatório adicionado.')
        setOpen(false)
        formRef.current?.reset()
      } catch (err) {
        setError('Erro ao fazer upload: ' + String(err))
      }
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
        Adicionar relatório
      </button>

      {okMsg && (
        <p className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 flex items-center justify-between gap-2">
          {okMsg}
          <button type="button" onClick={() => setOkMsg(null)} className="text-green-500 hover:text-green-700 text-xs">✕</button>
        </p>
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
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Novo relatório</h2>
            <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="rep-title" className="block text-xs font-medium text-slate-600 mb-1">Título</label>
                <input id="rep-title" name="title" type="text" required maxLength={300}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm" />
              </div>
              <div>
                <label htmlFor="rep-type" className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                <select id="rep-type" name="type" required
                  className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm bg-white">
                  <option value="technical">Relatório Técnico</option>
                  <option value="contract">Execução de Contrato</option>
                </select>
              </div>
              <div>
                <label htmlFor="rep-file" className="block text-xs font-medium text-slate-600 mb-1">Ficheiro</label>
                <input id="rep-file" name="file" type="file" required
                  className="w-full text-sm text-slate-600 file:mr-3 file:h-8 file:px-3 file:rounded-md file:border-0 file:bg-slate-100 file:text-slate-700 file:text-xs file:font-medium hover:file:bg-slate-200" />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="h-9 px-4 text-sm rounded-md border border-slate-200 text-slate-600">Cancelar</button>
                <button type="submit" disabled={pending}
                  className="h-9 px-4 text-sm rounded-md bg-slate-900 text-white disabled:opacity-50">
                  {pending ? 'A carregar...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
