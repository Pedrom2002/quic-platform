import { z } from 'zod'

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  CRON_SECRET: z
    .string()
    .min(32, 'CRON_SECRET must be at least 32 characters — generate with: openssl rand -hex 32'),
  QSTASH_TOKEN: z.string().min(1).optional(),
  QSTASH_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  BLOB_READ_WRITE_TOKEN: z.string().min(1, 'BLOB_READ_WRITE_TOKEN is required'),
  RESEND_WEBHOOK_SECRET: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  BREVO_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().optional(),
  BREVO_SMS_SENDER: z.string().min(1).max(11).optional(),
  NEXT_PUBLIC_PORTAL_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  QSTASH_CURRENT_SIGNING_KEY: z.string().min(1).optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().min(1).optional(),
  SMTP_ENCRYPTION_KEY: z.string().length(64, 'SMTP_ENCRYPTION_KEY must be 64 hex chars (32 bytes) — generate with: openssl rand -hex 32').optional(),
  PORTUGAL_ADMIN_PASSWORD: z.string().min(4, 'PORTUGAL_ADMIN_PASSWORD must be at least 4 chars — set it in Vercel env vars'),
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),
  // Sentry — todos opcionais. Sem SENTRY_DSN, o SDK fica em no-op (ver
  // instrumentation.ts / instrumentation-client.ts). AUTH_TOKEN/ORG/PROJECT
  // so sao usados para upload de source maps no build (ver next.config.ts).
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
  SENTRY_ORG: z.string().min(1).optional(),
  SENTRY_PROJECT: z.string().min(1).optional(),
})

export type ServerEnv = z.infer<typeof schema>

let _env: ServerEnv | undefined

export function getEnv(): ServerEnv {
  if (_env && process.env.NODE_ENV !== 'test') return _env
  const result = schema.safeParse(process.env)
  if (!result.success) {
    const issues = result.error.issues
      .map(i => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`[env] Missing or invalid environment variables:\n${issues}`)
  }
  _env = result.data
  return _env
}
