'use server'

import { revalidatePath } from 'next/cache'

import { requireOrgAuth } from '@/lib/supabase/actions'
import { movementSchema } from '@/lib/stock/validation'

export type ActionResult = { error?: string }

async function getTeamContext() {
  try {
    const { supabase, user, member } = await requireOrgAuth()
    if (member.role !== 'admin' && member.role !== 'manager') {
      return null
    }
    return { supabase, userId: user.id }
  } catch {
    return null
  }
}

function insufficientStockMessage(disponivel: number) {
  return `Stock insuficiente (disponível: ${disponivel})`
}

export async function addMovement(formData: FormData): Promise<ActionResult> {
  const context = await getTeamContext()
  if (!context) {
    return { error: 'Sem permissões de equipa' }
  }
  const { supabase, userId } = context

  const eventId = formData.get('event_id')
  const notes = formData.get('notes')

  const parsed = movementSchema.safeParse({
    material_id: formData.get('material_id'),
    event_id: eventId ? String(eventId) : null,
    type: formData.get('type'),
    quantity: formData.get('quantity'),
    notes: notes ? String(notes) : null,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues.map((issue) => issue.message).join('; ') }
  }

  // 1.ª defesa: para saídas, confirmar o disponível na view antes de inserir.
  if (parsed.data.type === 'saida') {
    const { data: availability, error: availabilityError } = await supabase
      .from('stock_material_availability')
      .select('disponivel')
      .eq('material_id', parsed.data.material_id)
      .single()
    if (availabilityError) {
      return { error: 'Erro ao verificar a disponibilidade' }
    }

    const disponivel = availability?.disponivel ?? 0
    if (parsed.data.quantity > disponivel) {
      return { error: insufficientStockMessage(disponivel) }
    }
  }

  const { error } = await supabase.from('stock_movements').insert({
    ...parsed.data,
    created_by: userId,
  })
  if (error) {
    // 2.ª defesa: o trigger da BD bloqueia saídas acima do disponível com
    // "stock insuficiente: disponivel N". Mapear para a mesma mensagem PT.
    if (error.message.includes('stock insuficiente')) {
      const match = error.message.match(/disponivel (-?\d+)/)
      return { error: insufficientStockMessage(match ? Number(match[1]) : 0) }
    }
    return { error: 'Erro ao registar movimento' }
  }

  revalidatePath('/dashboard/stock/movimentos')
  revalidatePath('/dashboard/stock/eventos')
  if (parsed.data.event_id) {
    revalidatePath(`/dashboard/stock/eventos/${parsed.data.event_id}`)
  }
  revalidatePath('/dashboard/stock/materiais')
  revalidatePath('/dashboard/stock')
  return {}
}
