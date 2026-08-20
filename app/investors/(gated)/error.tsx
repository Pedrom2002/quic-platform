'use client'

import ErrorState from '@/components/dashboard/ErrorState'

export default function InvestorsGatedError({
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
      title="Ocorreu um erro"
      description="Algo correu mal ao carregar esta página."
    />
  )
}
