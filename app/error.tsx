'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[root error]', error)
  }, [error])

  return (
    <html lang="pt">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-4 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <h1 className="text-lg font-semibold text-zinc-900">Algo correu mal</h1>
        <p className="max-w-sm text-sm text-zinc-500">
          Ocorreu um erro inesperado. Por favor tenta novamente.
        </p>
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </button>
      </body>
    </html>
  )
}
