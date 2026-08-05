// mobile/lib/sentry.ts
import * as Sentry from '@sentry/react-native'

// Sem EXPO_PUBLIC_SENTRY_DSN definido, o SDK fica em no-op — nao envia nada
// nem falha. Mesmo padrao usado no backend (ver sentry.server.config.ts).
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN

export function initSentry(): void {
  if (!dsn) return
  Sentry.init({
    dsn,
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
  })
}

export { Sentry }
