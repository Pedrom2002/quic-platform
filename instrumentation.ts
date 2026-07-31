import * as Sentry from '@sentry/nextjs'

// Valida as env vars obrigatorias assim que o servidor arranca, para falhar
// rapido no deploy em vez de um 500 em runtime na primeira request que as usa.
// Ver lib/env.ts (getEnv ja lanca erro em caso de env invalida/em falta).
//
// Tambem inicializa o Sentry (server/edge) via os configs dedicados. Sem
// SENTRY_DSN definido, o SDK do Sentry fica em no-op — nao afeta o arranque.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')

    const { getEnv } = await import('@/lib/env')
    try {
      getEnv()
    } catch (err) {
      console.error('[instrumentation] validacao de env falhou no arranque:', err)
      throw err
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
