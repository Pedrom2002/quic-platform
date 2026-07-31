import * as Sentry from '@sentry/nextjs'

type LogLevel = 'info' | 'warn' | 'error'

function emit(level: LogLevel, ns: string, msg: string, meta?: Record<string, unknown>): void {
  const entry = JSON.stringify({ ts: new Date().toISOString(), level, ns, msg, ...meta })
  if (level === 'error') {
    console.error(entry)
    // Sem SENTRY_DSN configurado o SDK fica em no-op, portanto isto e seguro
    // mesmo antes de haver um projeto Sentry. Envia o meta.error se for um
    // Error de verdade; caso contrario captura a mensagem como erro.
    const err = meta?.error
    if (err instanceof Error) {
      Sentry.captureException(err, { extra: { ns, msg, ...meta } })
    } else {
      Sentry.captureMessage(msg, { level: 'error', extra: { ns, ...meta } })
    }
  } else if (level === 'warn') {
    console.warn(entry)
  } else {
    console.log(entry)
  }
}

export function createLogger(ns: string) {
  return {
    info:  (msg: string, meta?: Record<string, unknown>) => emit('info',  ns, msg, meta),
    warn:  (msg: string, meta?: Record<string, unknown>) => emit('warn',  ns, msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => emit('error', ns, msg, meta),
  }
}
