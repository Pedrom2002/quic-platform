'use client'

import { useState, useEffect } from 'react'
import { X, MessageSquare, Loader2, Send } from 'lucide-react'
import { sendClientUpdateAction } from '@/app/dashboard/events/[eventId]/actions'

const FOCUS_OPTIONS = [
  'Update geral de progresso',
  'Confirmação de detalhes do evento',
  'Aviso de prazo / item pendente',
  'Mensagem de boas-vindas',
]

interface Props {
  eventId: string
  clientCount: number
  onClose: () => void
}

export default function ClientUpdateModal({ eventId, clientCount, onClose }: Props) {
  const [focus, setFocus] = useState(FOCUS_OPTIONS[0])
  const [text, setText] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<number | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleGenerate() {
    setStreaming(true)
    setText('')
    setError(null)
    setSent(null)

    try {
      const res = await fetch('/api/ai/client-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, focus }),
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
      setError('Erro ao gerar. Tenta novamente.')
    } finally {
      setStreaming(false)
    }
  }

  async function handleSend() {
    if (!text.trim() || sending) return
    setSending(true)
    setError(null)

    try {
      const result = await sendClientUpdateAction(eventId, text.trim())
      setSent(result.sent)
      setTimeout(onClose, 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar. Tenta novamente.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-green-600" />
            <h2 className="text-sm font-semibold text-slate-800">Atualizar cliente</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Focus selector */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Foco da mensagem</label>
            <div className="flex gap-2">
              <select
                value={focus}
                onChange={e => setFocus(e.target.value)}
                disabled={streaming}
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-300 disabled:opacity-50"
              >
                {FOCUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <button
                onClick={handleGenerate}
                disabled={streaming}
                className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {streaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {streaming ? 'A gerar...' : 'Gerar'}
              </button>
            </div>
          </div>

          {/* Generated text */}
          {(text || streaming) && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Mensagem {streaming ? <span className="text-slate-400">(a gerar...)</span> : <span className="text-slate-400">(editável)</span>}
              </label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                disabled={streaming}
                rows={10}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-300 resize-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
          {sent !== null && (
            <p className="text-sm text-green-600 font-medium">Enviado para {sent} cliente{sent !== 1 ? 's' : ''}.</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <span className="text-xs text-slate-400">{clientCount} cliente{clientCount !== 1 ? 's' : ''} com email</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 text-slate-500 hover:text-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSend}
              disabled={!text.trim() || streaming || sending || sent !== null}
              className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Enviar a {clientCount} cliente{clientCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
