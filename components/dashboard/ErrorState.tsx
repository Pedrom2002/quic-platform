'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function ErrorState({
  error,
  reset,
  title,
  description,
}: {
  error: Error & { digest?: string }
  reset: () => void
  title: string
  description: string
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 text-center px-4">
      <AlertTriangle className="w-10 h-10 text-amber-500" />
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      <p className="text-sm text-zinc-500 max-w-sm">{description}</p>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Tentar novamente
      </button>
    </div>
  )
}
