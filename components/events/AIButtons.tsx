'use client'

import { useState } from 'react'
import { Sparkles, ShieldAlert, MessageSquare } from 'lucide-react'
import dynamic from 'next/dynamic'

const EventSummaryModal = dynamic(() => import('./EventSummaryModal'))
const RiskAnalysisModal = dynamic(() => import('./RiskAnalysisModal'))
const ClientUpdateModal = dynamic(() => import('./ClientUpdateModal'))

interface Props {
  eventId: string
  clientCount: number
}

export default function AIButtons({ eventId, clientCount }: Props) {
  const [showSummary, setShowSummary] = useState(false)
  const [showRisk, setShowRisk] = useState(false)
  const [showUpdate, setShowUpdate] = useState(false)

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
        <button
          onClick={() => setShowUpdate(true)}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 border border-green-200 text-green-600 rounded-lg hover:bg-green-50 transition-colors"
        >
          <MessageSquare className="w-4 h-4" /> Atualizar Cliente
        </button>
      </div>

      {showSummary && (
        <EventSummaryModal eventId={eventId} onClose={() => setShowSummary(false)} />
      )}
      {showRisk && (
        <RiskAnalysisModal eventId={eventId} onClose={() => setShowRisk(false)} />
      )}
      {showUpdate && (
        <ClientUpdateModal
          eventId={eventId}
          clientCount={clientCount}
          onClose={() => setShowUpdate(false)}
        />
      )}
    </>
  )
}
