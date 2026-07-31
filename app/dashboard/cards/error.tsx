'use client'

import ErrorState from '@/components/dashboard/ErrorState'

export default function CardsError({
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
      title="Erro ao carregar os cards"
      description="Não foi possível carregar os cartões digitais da equipa. Tenta novamente."
    />
  )
}
