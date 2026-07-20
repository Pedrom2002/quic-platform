'use server'

import { revalidatePath } from 'next/cache'
import * as z from 'zod'

import { requireOrgAuth } from '@/lib/supabase/actions'
import { createTicketTypeSchema, updateTicketTypeSchema } from '@/schemas/ticket-type.schema'

export type ActionResult = { error?: string }

async function getOrgClient() {
  try {
    return await requireOrgAuth()
  } catch {
    return null
  }
}

function issuesToMessage(error: z.ZodError) {
  return error.issues.map(issue => issue.message).join('; ')
}

export async function createTicketType(eventId: string, formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const parsed = createTicketTypeSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    price_cents: formData.get('price_cents'),
    quantity_total: formData.get('quantity_total'),
  })
  if (!parsed.success) return { error: issuesToMessage(parsed.error) }

  const { error } = await auth.supabase.from('ticket_types').insert({
    ...parsed.data,
    event_id: eventId,
    organization_id: auth.member.organization_id,
  })
  if (error) return { error: 'Erro ao criar tipo de bilhete' }

  revalidatePath(`/dashboard/events/${eventId}/tickets`)
  return {}
}

export async function updateTicketType(eventId: string, formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: 'Tipo de bilhete inválido' }

  const parsed = updateTicketTypeSchema.safeParse({
    name: formData.get('name') || undefined,
    description: formData.get('description') || undefined,
    price_cents: formData.get('price_cents') || undefined,
    quantity_total: formData.get('quantity_total') || undefined,
  })
  if (!parsed.success) return { error: issuesToMessage(parsed.error) }

  const { error } = await auth.supabase
    .from('ticket_types')
    .update(parsed.data)
    .eq('id', id.data)
  if (error) return { error: 'Erro ao atualizar tipo de bilhete' }

  revalidatePath(`/dashboard/events/${eventId}/tickets`)
  return {}
}

export async function toggleTicketTypeActive(eventId: string, formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: 'Tipo de bilhete inválido' }

  const isActive = formData.get('is_active') === 'true'

  const { error } = await auth.supabase
    .from('ticket_types')
    .update({ is_active: isActive })
    .eq('id', id.data)
  if (error) return { error: 'Erro ao atualizar o estado' }

  revalidatePath(`/dashboard/events/${eventId}/tickets`)
  return {}
}
