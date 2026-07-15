'use server'

import { revalidatePath } from 'next/cache'
import * as z from 'zod'

import { requireOrgAuth } from '@/lib/supabase/actions'

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

export async function updateQuoteStatus(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await getTeamClient()
  if (!supabase) {
    return { error: 'Sem permissões de equipa' }
  }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) {
    return { error: 'Pedido inválido' }
  }

  const status = z
    .enum(['novo', 'em_analise', 'respondido', 'fechado'], {
      error: 'Estado inválido',
    })
    .safeParse(formData.get('status'))
  if (!status.success) {
    return { error: issuesToMessage(status.error) }
  }

  const { error } = await supabase
    .from('stock_quote_requests')
    .update({ status: status.data })
    .eq('id', id.data)
  if (error) {
    return { error: 'Erro ao atualizar o estado do pedido' }
  }

  revalidatePath('/dashboard/stock/pedidos')
  revalidatePath(`/dashboard/stock/pedidos/${id.data}`)
  revalidatePath('/dashboard/stock')
  return {}
}
