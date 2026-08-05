'use server'

import { revalidatePath } from 'next/cache'
import * as z from 'zod'

import { requireOrgAuth } from '@/lib/supabase/actions'
import { eventSchema } from '@/lib/stock/validation'

export type ActionResult = { error?: string }

async function getTeamClient() {
  try {
    const { supabase, member } = await requireOrgAuth()
    if (member.role !== 'admin' && member.role !== 'manager') {
      return null
    }
    return supabase
  } catch {
    return null
  }
}

function issuesToMessage(error: z.ZodError) {
  return error.issues.map((issue) => issue.message).join('; ')
}

function parseEventForm(formData: FormData) {
  const clientName = formData.get('client_name')
  const startsOn = formData.get('starts_on')
  const endsOn = formData.get('ends_on')
  const notes = formData.get('notes')

  return eventSchema.safeParse({
    name: formData.get('name'),
    client_name: clientName ? String(clientName) : null,
    starts_on: startsOn ? String(startsOn) : null,
    ends_on: endsOn ? String(endsOn) : null,
    status: formData.get('status'),
    notes: notes ? String(notes) : null,
  })
}

export async function createEvent(formData: FormData): Promise<ActionResult> {
  const supabase = await getTeamClient()
  if (!supabase) {
    return { error: 'Sem permissões de equipa' }
  }

  const parsed = parseEventForm(formData)
  if (!parsed.success) {
    return { error: issuesToMessage(parsed.error) }
  }

  const { error } = await supabase.from('stock_events').insert(parsed.data)
  if (error) {
    return { error: 'Erro ao criar evento' }
  }

  revalidatePath('/dashboard/stock/eventos')
  revalidatePath('/dashboard/stock')
  return {}
}

export async function updateEvent(formData: FormData): Promise<ActionResult> {
  const supabase = await getTeamClient()
  if (!supabase) {
    return { error: 'Sem permissões de equipa' }
  }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) {
    return { error: 'Evento inválido' }
  }

  const parsed = parseEventForm(formData)
  if (!parsed.success) {
    return { error: issuesToMessage(parsed.error) }
  }

  const { error } = await supabase
    .from('stock_events')
    .update(parsed.data)
    .eq('id', id.data)
  if (error) {
    return { error: 'Erro ao atualizar evento' }
  }

  revalidatePath('/dashboard/stock/eventos')
  revalidatePath(`/dashboard/stock/eventos/${id.data}`)
  revalidatePath('/dashboard/stock')
  return {}
}

export async function updateEventStatus(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await getTeamClient()
  if (!supabase) {
    return { error: 'Sem permissões de equipa' }
  }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) {
    return { error: 'Evento inválido' }
  }

  const status = z
    .enum(['planeado', 'em_curso', 'concluido'], { error: 'Estado inválido' })
    .safeParse(formData.get('status'))
  if (!status.success) {
    return { error: issuesToMessage(status.error) }
  }

  if (status.data === 'concluido') {
    const { data: movements } = await supabase
      .from('stock_movements')
      .select('material_id, type, quantity')
      .eq('event_id', id.data)
      .in('type', ['saida', 'entrada'])

    const outstanding = new Map<string, number>()
    for (const m of movements ?? []) {
      const qty = outstanding.get(m.material_id) ?? 0
      outstanding.set(m.material_id, qty + (m.type === 'saida' ? m.quantity : -m.quantity))
    }
    const hasOutstanding = [...outstanding.values()].some((qty) => qty > 0)
    if (hasOutstanding) {
      return { error: 'Ainda há material por devolver. Regista as entradas antes de concluir o evento.' }
    }
  }

  const { error } = await supabase
    .from('stock_events')
    .update({ status: status.data })
    .eq('id', id.data)
  if (error) {
    return { error: 'Erro ao atualizar o estado do evento' }
  }

  revalidatePath('/dashboard/stock/eventos')
  revalidatePath(`/dashboard/stock/eventos/${id.data}`)
  revalidatePath('/dashboard/stock')
  return {}
}

// Apagar evento é seguro: event_id em stock_movements tem on delete set null,
// por isso os movimentos ficam sem evento associado mas não se perdem.
export async function deleteEvent(formData: FormData): Promise<ActionResult> {
  const supabase = await getTeamClient()
  if (!supabase) {
    return { error: 'Sem permissões de equipa' }
  }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) {
    return { error: 'Evento inválido' }
  }

  const { error } = await supabase
    .from('stock_events')
    .delete()
    .eq('id', id.data)
  if (error) {
    return { error: 'Erro ao apagar evento' }
  }

  revalidatePath('/dashboard/stock/eventos')
  revalidatePath('/dashboard/stock/movimentos')
  revalidatePath('/dashboard/stock')
  return {}
}
