interface AuditEvent {
  action: string
  userId: string
  organizationId: string
  eventId?: string
  metadata?: Record<string, unknown>
}

export function audit(_event: AuditEvent): void {
  // no-op stub
}
