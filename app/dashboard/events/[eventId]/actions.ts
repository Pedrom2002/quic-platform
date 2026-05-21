'use server'

import { requireOrgAuth } from '@/lib/supabase/actions'
import { sendEmail, buildEmailHtml } from '@/lib/notifications/channels/email'
import { renderTemplate } from '@/lib/notifications/template-renderer'
import { audit } from '@/lib/audit'
import { generatePortalToken } from '@/lib/portal/token'
import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'

type EmailRecipient = { full_name: string; email: string }

type SupabaseServer = Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>

async function getEmailableClients(supabase: SupabaseServer, eventId: string): Promise<EmailRecipient[]> {
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

/**
 * Loads an active email template for the given key with a safe inline fallback
 * so a missing seed row never blocks a manual send.
 */
async function loadEmailTemplate(
  supabase: SupabaseServer,
  organizationId: string,
  templateKey: 'welcome' | 'client_update',
  fallback: { subject: string; body: string }
): Promise<{ subject: string; body: string }> {
  const { data } = await supabase
    .from('message_templates')
    .select('subject, body_template')
    .eq('organization_id', organizationId)
    .eq('template_key', templateKey)
    .eq('channel', 'email')
    .eq('language', 'pt')
    .eq('is_active', true)
    .maybeSingle()

  if (data?.body_template) {
    return { subject: data.subject ?? fallback.subject, body: data.body_template }
  }
  return fallback
}

async function sendEmailsAndReport(
  recipients: EmailRecipient[],
  render: (recipient: EmailRecipient) => { subject: string; html: string }
): Promise<{ sent: number }> {
  let sent = 0
  const errors: string[] = []
  for (const client of recipients) {
    try {
      const { subject, html } = render(client)
      await sendEmail({ to: client.email, toName: client.full_name, subject, html })
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
    .select('id, name, portal_token, organization_id, start_datetime')
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!event) throw new Error('Evento não encontrado')

  const recipients = await getEmailableClients(supabase, eventId)
  if (!recipients.length) throw new Error('Nenhum cliente com email configurado para este evento')

  const portalUrl = `${portalBase}/portal/${event.portal_token}`
  const eventDate = event.start_datetime
    ? format(new Date(event.start_datetime), "d 'de' MMMM 'de' yyyy", { locale: pt })
    : ''

  const template = await loadEmailTemplate(
    supabase,
    member.organization_id,
    'welcome',
    {
      subject: 'O portal do seu evento "{{event_name}}" está disponível',
      body:
`Caro(a) {{client_name}},

É com prazer que damos início, formalmente, à preparação do seu evento "{{event_name}}", agendado para {{event_date}}.

A partir deste momento, fica ao seu dispor um portal exclusivo onde poderá acompanhar, em tempo real, o progresso de todas as etapas da organização:

{{portal_url}}

O acesso é pessoal e foi gerado especificamente para este evento.

Com os melhores cumprimentos,
Equipa Quic`,
    }
  )

  audit({ action: 'portal.link.sent', userId: user.id, organizationId: member.organization_id, eventId })

  await sendEmailsAndReport(recipients, (client) => {
    const vars = {
      client_name: client.full_name,
      event_name: event.name,
      event_date: eventDate,
      portal_url: portalUrl,
    }
    return {
      subject: renderTemplate(template.subject, vars),
      html: buildEmailHtml(renderTemplate(template.body, vars), event.name),
    }
  })
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

  const template = await loadEmailTemplate(
    supabase,
    member.organization_id,
    'client_update',
    {
      subject: 'Comunicação sobre o seu evento — {{event_name}}',
      body:
`Caro(a) {{client_name}},

{{custom_message}}

Permanecemos ao seu dispor para qualquer esclarecimento adicional.

Com os melhores cumprimentos,
Equipa Quic`,
    }
  )

  audit({ action: 'client.update.sent', userId: user.id, organizationId: member.organization_id, eventId })

  return sendEmailsAndReport(recipients, (client) => {
    const vars = {
      client_name: client.full_name,
      event_name: event.name,
      custom_message: text,
    }
    return {
      subject: renderTemplate(template.subject, vars),
      html: buildEmailHtml(renderTemplate(template.body, vars), event.name),
    }
  })
}
