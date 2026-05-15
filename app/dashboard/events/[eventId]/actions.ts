'use server'

import { requireOrgAuth } from '@/lib/supabase/actions'
import { sendEmail, buildEmailHtml } from '@/lib/notifications/channels/email'
import { audit } from '@/lib/audit'
import { generatePortalToken } from '@/lib/portal/token'
import { revalidatePath } from 'next/cache'

type EmailRecipient = { full_name: string; email: string }

async function getEmailableClients(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  eventId: string
): Promise<EmailRecipient[]> {
  const { data: eventClients } = await supabase
    .from('event_clients')
    .select('*, client:clients(full_name, email)')
    .eq('event_id', eventId)
    .eq('opted_out', false)

  return (eventClients ?? [])
    .filter(ec => (ec.notification_prefs as { channels?: string[] })?.channels?.includes('email') ?? true)
    .flatMap(ec => {
      const client = ec.client as { full_name: string; email: string | null } | null
      return client?.email ? [{ full_name: client.full_name, email: client.email }] : []
    })
}

async function sendEmailsAndReport(
  recipients: EmailRecipient[],
  subject: string,
  getHtml: (recipient: EmailRecipient) => string
): Promise<{ sent: number }> {
  let sent = 0
  const errors: string[] = []
  for (const client of recipients) {
    try {
      await sendEmail({ to: client.email, toName: client.full_name, subject, html: getHtml(client) })
      sent++
    } catch (err: unknown) {
      errors.push(client.email)
      console.error('[sendEmail] failed for recipient:', err instanceof Error ? err.message : err)
    }
  }
  if (errors.length && sent === 0) throw new Error(`Falhou o envio para todos os ${recipients.length} destinatários`)
  if (errors.length) throw new Error(`Enviado para ${sent} de ${recipients.length} destinatários. ${errors.length} falhou`)
  return { sent }
}

export async function sendPortalLinkAction(eventId: string) {
  const portalBase = process.env.NEXT_PUBLIC_PORTAL_URL ?? process.env.NEXT_PUBLIC_APP_URL
  if (!portalBase) throw new Error('NEXT_PUBLIC_PORTAL_URL ou NEXT_PUBLIC_APP_URL não configurado')

  const { supabase, user, member } = await requireOrgAuth()

  const { data: event } = await supabase
    .from('events')
    .select('id, name, portal_token, organization_id')
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!event) throw new Error('Evento não encontrado')

  const recipients = await getEmailableClients(supabase, eventId)
  if (!recipients.length) throw new Error('Nenhum cliente com email configurado para este evento')

  const portalUrl = `${portalBase}/portal/${event.portal_token}`

  audit({ action: 'portal.link.sent', userId: user.id, organizationId: member.organization_id, eventId })

  await sendEmailsAndReport(
    recipients,
    `Portal do evento: ${event.name}`,
    (client) => {
      const body = `Olá ${client.full_name},\n\nPode acompanhar o estado do seu evento em tempo real através do portal:\n\n${portalUrl}\n\nO link é pessoal e não tem data de expiração.`
      return buildEmailHtml(body, event.name)
    }
  )
}

export async function regeneratePortalTokenAction(eventId: string): Promise<void> {
  const { supabase, user, member } = await requireOrgAuth()

  const newToken = generatePortalToken()

  const { error } = await supabase
    .from('events')
    .update({ portal_token: newToken, portal_token_expires_at: null })
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)

  if (error) throw new Error('Erro ao regenerar link do portal')

  audit({ action: 'portal.token.revoked', userId: user.id, organizationId: member.organization_id, eventId })
  revalidatePath(`/dashboard/events/${eventId}`)
}

export async function revokePortalTokenAction(eventId: string): Promise<void> {
  const { supabase, user, member } = await requireOrgAuth()

  const { error } = await supabase
    .from('events')
    .update({ portal_token_expires_at: new Date().toISOString() })
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)

  if (error) throw new Error('Erro ao revogar token do portal')

  audit({ action: 'portal.token.revoked', userId: user.id, organizationId: member.organization_id, eventId })
}

export async function sendClientUpdateAction(
  eventId: string,
  text: string
): Promise<{ sent: number }> {
  const { supabase, user, member } = await requireOrgAuth()

  const { data: event } = await supabase
    .from('events')
    .select('id, name, organization_id')
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!event) throw new Error('Evento não encontrado')

  const recipients = await getEmailableClients(supabase, eventId)
  if (!recipients.length) throw new Error('Nenhum cliente com email configurado para este evento')

  audit({ action: 'client.update.sent', userId: user.id, organizationId: member.organization_id, eventId })

  return sendEmailsAndReport(
    recipients,
    `Atualização do evento: ${event.name}`,
    () => buildEmailHtml(text, event.name)
  )
}
