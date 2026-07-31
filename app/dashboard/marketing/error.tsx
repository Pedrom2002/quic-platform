'use client'

import ErrorState from '@/components/dashboard/ErrorState'

export default function MarketingError({
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
      title="Erro ao carregar marketing"
      description="Não foi possível carregar as campanhas ou contactos. Tenta novamente."
    />
  )
}
