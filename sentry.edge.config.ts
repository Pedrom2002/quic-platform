// Inicializacao Edge runtime (middleware, edge routes) do Sentry.
// Sem SENTRY_DSN definido, o SDK fica em no-op — nao envia nada nem falha.
// Importado condicionalmente por instrumentation.ts via register().
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // 10% das transacoes em producao, 100% em dev — ajustar conforme volume real.
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
})
