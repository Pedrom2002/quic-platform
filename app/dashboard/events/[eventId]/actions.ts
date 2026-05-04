'use server'

import { createClient } from '@/lib/supabase/server'
import { sendEmail, buildEmailHtml } from '@/lib/notifications/channels/email'

async function resolveOrgMember(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('auth_user_id', userId)
    .single()
  return data
}

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

  const recipients = (eventClients ?? []).filter(
    ec => (ec.notification_prefs as { channels?: string[] })?.channels?.includes('email') ?? true
  )

  if (!recipients.length) throw new Error('Nenhum cliente com email configurado para este evento')

  const errors: string[] = []
  for (const ec of recipients) {
    const client = ec.client as { full_name: string; email: string | null } | null
    if (!client?.email) continue
    try {
      const body = `Olá ${client.full_name},\n\nPode acompanhar o estado do seu evento em tempo real através do portal:\n\n${portalUrl}\n\nO link é pessoal e válido durante 90 dias.`
      const html = buildEmailHtml(body, event.name)
      await sendEmail({
        to: client.email,
        toName: client.full_name,
        subject: `Portal do evento: ${event.name}`,
        html,
      })
    } catch (err: unknown) {
      errors.push(client.email)
      console.error('[sendPortalLink]', err instanceof Error ? err.message : err)
    }
  }

  if (errors.length) throw new Error(`Falhou o envio para: ${errors.join(', ')}`)
}
