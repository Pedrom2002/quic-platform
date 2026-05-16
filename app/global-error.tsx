'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[global error]', error)
  }, [error])

  return (
    <html lang="pt">
      <body style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '1rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#18181b' }}>Erro crítico</h1>
        <p style={{ fontSize: '0.875rem', color: '#71717a', maxWidth: '24rem' }}>
          A aplicação encontrou um erro inesperado.
        </p>
        <button
          onClick={reset}
          style={{ padding: '0.5rem 1rem', background: '#18181b', color: '#fff', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  )
}
