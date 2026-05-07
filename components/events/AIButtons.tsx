'use client'

import { useState } from 'react'
import { Sparkles, ShieldAlert } from 'lucide-react'
import dynamic from 'next/dynamic'

const EventSummaryModal = dynamic(() => import('./EventSummaryModal'))
const RiskAnalysisModal = dynamic(() => import('./RiskAnalysisModal'))

interface Props {
  eventId: string
}

export default function AIButtons({ eventId }: Props) {
  const [showSummary, setShowSummary] = useState(false)
  const [showRisk, setShowRisk] = useState(false)

  return (
    <>
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={() => setShowSummary(true)}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 border border-violet-200 text-violet-600 rounded-lg hover:bg-violet-50 transition-colors"
        >
          <Sparkles className="w-4 h-4" /> Resumo IA
        </button>
        <button
          onClick={() => setShowRisk(true)}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
        >
          <ShieldAlert className="w-4 h-4" /> Analisar Risco
        </button>
      </div>

      {showSummary && (
        <EventSummaryModal eventId={eventId} onClose={() => setShowSummary(false)} />
      )}
      {showRisk && (
        <RiskAnalysisModal eventId={eventId} onClose={() => setShowRisk(false)} />
      )}
    </>
  )
}
