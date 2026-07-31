// Inicializacao client-side do Sentry (App Router).
// Sem NEXT_PUBLIC_SENTRY_DSN definido, o SDK fica em no-op — nao envia nada
// nem falha. Ver docs/setup em node_modules/@sentry/nextjs.
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 10% das transacoes em producao, 100% em dev — ajustar conforme volume real.
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
})

// Necessario para o App Router instrumentar navegacoes client-side (SDK >= 9.12.0).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
