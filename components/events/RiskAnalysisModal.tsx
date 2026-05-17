'use client'

import { useState, useEffect } from 'react'
import { X, ShieldAlert, Loader2 } from 'lucide-react'

type RiskLevel = 'green' | 'yellow' | 'red'

const LEVEL_BADGE: Record<RiskLevel, { label: string; class: string }> = {
  green: { label: 'Baixo Risco', class: 'bg-green-100 text-green-700' },
  yellow: { label: 'Risco Moderado', class: 'bg-amber-100 text-amber-700' },
  red: { label: 'Alto Risco', class: 'bg-red-100 text-red-700' },
}

interface Props {
  eventId: string
  onClose: () => void
}

export default function RiskAnalysisModal({ eventId, onClose }: Props) {
  const [level, setLevel] = useState<RiskLevel | null>(null)
  const [prose, setProse] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        const res = await fetch('/api/ai/risk-analysis', {
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
        let accumulated = ''
        let levelParsed = false

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          accumulated += decoder.decode(value, { stream: true })

          if (!levelParsed) {
            const lines = accumulated.split('\n')
            const levelLine = lines.find(l => l.startsWith('LEVEL:'))
            if (levelLine) {
              const parsed = levelLine.replace('LEVEL:', '').trim() as RiskLevel
              if (['green', 'yellow', 'red'].includes(parsed)) {
                setLevel(parsed)
                levelParsed = true
                const afterLevel = accumulated.slice(accumulated.indexOf('\n\n') + 2)
                setProse(afterLevel)
              }
            }
          } else {
            const afterLevel = accumulated.slice(accumulated.indexOf('\n\n') + 2)
            setProse(afterLevel)
          }
        }
      } catch {
        setError('Erro de ligação. Tenta novamente.')
      } finally {
        setLoading(false)
      }
    }
    fetchAnalysis()
  }, [eventId])

  const badge = level ? LEVEL_BADGE[level] : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose} aria-hidden="true">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="risk-analysis-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-orange-500" aria-hidden="true" />
            <h2 id="risk-analysis-title" className="text-sm font-semibold text-slate-800">Análise de risco</h2>
            {badge && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.class}`}>
                {badge.label}
              </span>
            )}
          </div>
          <button onClick={onClose} aria-label="Fechar" className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && !prose && !error && (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              A analisar...
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {prose && (
            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{prose}</div>
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
