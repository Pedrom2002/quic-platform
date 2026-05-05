'use server'

import { createClient } from '@/lib/supabase/server'
import { sendEmail, buildEmailHtml } from '@/lib/notifications/channels/email'
import { resolveOrgMember } from '@/lib/supabase/actions'

export async function sendPortalLinkAction(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  const { data: event } = await supabase
    .from('events')
    .select('id, name, portal_token, organization_id')
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!event) throw new Error('Evento não encontrado')

  const { data: eventClients } = await supabase
    .from('event_clients')
    .select('*, client:clients(full_name, email)')
    .eq('event_id', eventId)
    .eq('opted_out', false)

  const portalBase = process.env.NEXT_PUBLIC_PORTAL_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
  const portalUrl = `${portalBase}/portal/${event.portal_token}`

  type EmailableClient = { full_name: string; email: string }

  const recipients = (eventClients ?? [])
    .filter(ec => (ec.notification_prefs as { channels?: string[] })?.channels?.includes('email') ?? true)
    .flatMap(ec => {
      const client = ec.client as { full_name: string; email: string | null } | null
      return client?.email ? [{ full_name: client.full_name, email: client.email } as EmailableClient] : []
    })

  if (!recipients.length) throw new Error('Nenhum cliente com email configurado para este evento')

  let sent = 0
  const errors: string[] = []
  for (const client of recipients) {
    try {
      const body = `Olá ${client.full_name},\n\nPode acompanhar o estado do seu evento em tempo real através do portal:\n\n${portalUrl}\n\nO link é pessoal e válido durante 90 dias.`
      const html = buildEmailHtml(body, event.name)
      await sendEmail({
        to: client.email,
        toName: client.full_name,
        subject: `Portal do evento: ${event.name}`,
        html,
      })
      sent++
    } catch (err: unknown) {
      errors.push(client.email)
      console.error('[sendPortalLink]', err instanceof Error ? err.message : err)
    }
  }

  if (errors.length && sent === 0) throw new Error(`Falhou o envio para todos os destinatários: ${errors.join(', ')}`)
  if (errors.length) throw new Error(`Enviado para ${sent} de ${recipients.length}. Falhou: ${errors.join(', ')}`)
}
