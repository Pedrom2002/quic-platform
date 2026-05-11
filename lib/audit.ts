import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type AuditAction =
  | 'portal.link.sent'
  | 'portal.token.revoked'
  | 'client.update.sent'
  | 'event.created'
  | 'event.deleted'
  | 'event.status.changed'
  | 'file.uploaded'
  | 'file.deleted'
  | 'member.invited'
  | 'ai.generate-tasks'
  | 'ai.describe-task'
  | 'ai.risk-analysis'
  | 'ai.event-summary'
  | 'ai.client-update'
  | 'ai.suggest-assignee'

export function audit(args: {
  action: AuditAction
  userId?: string
  organizationId?: string
  eventId?: string
  meta?: Record<string, unknown>
}): void {
  const entry = { ts: new Date().toISOString(), ...args }
  // Structured log always — useful in Vercel log drains
  console.log(JSON.stringify({ audit: true, ...entry }))
  // Persist to DB without blocking the response.
  // Requires an `audit_log(action text, payload jsonb)` table.
  after(async () => {
    try {
      const supabase = createAdminClient()
      await supabase.from('audit_log').insert({ action: args.action, payload: entry })
    } catch {
      // Non-critical — never break the request
    }
  })
}
