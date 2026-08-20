'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function InvestorsPublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 p-4 text-center">
      <AlertTriangle className="w-10 h-10 text-amber-500" />
      <h1 className="text-lg font-semibold text-white">Ocorreu um erro</h1>
      <p className="text-sm text-zinc-400 max-w-sm">Algo correu mal ao carregar esta página.</p>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-950 bg-white rounded-lg hover:bg-zinc-200 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Tentar novamente
      </button>
    </div>
  )
}
