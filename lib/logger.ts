type LogLevel = 'info' | 'warn' | 'error'

function emit(level: LogLevel, ns: string, msg: string, meta?: Record<string, unknown>): void {
  const entry = JSON.stringify({ ts: new Date().toISOString(), level, ns, msg, ...meta })
  if (level === 'error') console.error(entry)
  else if (level === 'warn') console.warn(entry)
  else console.log(entry)
}

export function createLogger(ns: string) {
  return {
    info:  (msg: string, meta?: Record<string, unknown>) => emit('info',  ns, msg, meta),
    warn:  (msg: string, meta?: Record<string, unknown>) => emit('warn',  ns, msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => emit('error', ns, msg, meta),
  }
}
