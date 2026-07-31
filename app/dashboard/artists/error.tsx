'use client'

import ErrorState from '@/components/dashboard/ErrorState'

export default function ArtistsError({
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
      title="Erro ao carregar artistas"
      description="Não foi possível carregar a lista de artistas. Tenta novamente."
    />
  )
}
