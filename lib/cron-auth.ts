import { timingSafeEqual } from 'node:crypto'

// Valida o header Authorization dos endpoints de cron contra o CRON_SECRET
// usando comparação em tempo constante (evita timing side-channels que uma
// comparação `===` / `!==` sobre strings exporia).
export function isValidCronAuth(authHeader: string | null, cronSecret: string): boolean {
  if (!authHeader) return false
  const expected = `Bearer ${cronSecret}`
  const a = Buffer.from(authHeader)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
