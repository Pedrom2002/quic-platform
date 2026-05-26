'use client'

import { useState } from 'react'

interface Insight {
  type: string
  text: string
}

interface Props {
  campaignId: string
}

export function InsightsCard({ campaignId }: Props) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function loadInsights() {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/marketing-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId }),
      })
      const data = await res.json() as { insights?: Insight[] }
      setInsights(data.insights ?? [])
    } finally {
      setLoading(false)
    }
  }

  function handleToggle() {
    const next = !open
    setOpen(next)
    if (next && insights.length === 0) loadInsights()
  }

  return (
    <div className="border rounded-lg overflow-hidden mb-6">
      <button onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-zinc-50">
        <span>Insights da IA</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 space-y-2">
          {loading && <p className="text-sm text-zinc-500">A analisar campanha...</p>}
          {insights.map((ins, i) => (
            <div key={i} className="flex gap-2 text-sm">
              <span className="text-zinc-400 shrink-0">•</span>
              <p>{ins.text}</p>
            </div>
          ))}
          {!loading && insights.length === 0 && (
            <p className="text-sm text-zinc-500">Sem insights disponíveis.</p>
          )}
        </div>
      )}
    </div>
  )
}
