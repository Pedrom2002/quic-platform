import { z } from 'zod'

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  PORTAL_JWT_SECRET: z
    .string()
    .min(32, 'PORTAL_JWT_SECRET must be at least 32 characters — generate with: openssl rand -hex 32'),
  CRON_SECRET: z
    .string()
    .min(32, 'CRON_SECRET must be at least 32 characters — generate with: openssl rand -hex 32'),
  QSTASH_TOKEN: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  BLOB_READ_WRITE_TOKEN: z.string().min(1, 'BLOB_READ_WRITE_TOKEN is required'),
  RESEND_WEBHOOK_SECRET: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z
    .string()
    .regex(/^sk-ant-/, 'ANTHROPIC_API_KEY must start with sk-ant-')
    .optional(),
  NEXT_PUBLIC_PORTAL_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  QSTASH_CURRENT_SIGNING_KEY: z.string().min(1).optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().min(1).optional(),
})

export type ServerEnv = z.infer<typeof schema>

let _env: ServerEnv | null = null

export function getEnv(): ServerEnv {
  if (_env) return _env
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
