'use client'

import ErrorState from '@/components/dashboard/ErrorState'

export default function StockError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Erro ao carregar o stock"
      description="Não foi possível carregar os dados de inventário. Tenta novamente."
    />
  )
}
