'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, Loader2 } from 'lucide-react'

interface Props {
  eventId: string
  onClose: () => void
}

export default function EventSummaryModal({ eventId, onClose }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch('/api/ai/event-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId }),
        })
        if (!res.ok || !res.body) {
          setError('Erro ao gerar. Tenta novamente.')
          return
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          setText(prev => prev + decoder.decode(value, { stream: true }))
        }
      } catch {
        setError('Erro de ligação. Tenta novamente.')
      } finally {
        setLoading(false)
      }
    }
    fetchSummary()
  }, [eventId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <h2 className="text-sm font-semibold text-slate-800">Resumo do evento</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && !text && (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              A gerar resumo...
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {text && (
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{text}</p>
          )}
        </div>
        <div className="flex justify-end px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="text-sm font-medium px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
