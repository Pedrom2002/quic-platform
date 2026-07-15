'use server'

import { revalidatePath } from 'next/cache'
import * as z from 'zod'

import { requireOrgAuth } from '@/lib/supabase/actions'
import { categorySchema } from '@/lib/stock/validation'

export type ActionResult = { error?: string }

// Código Postgres para violação de foreign key.
const FOREIGN_KEY_VIOLATION = '23503'

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

export async function createCategory(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await getTeamClient()
  if (!supabase) {
    return { error: 'Sem permissões de equipa' }
  }

  const parsed = categorySchema.safeParse({
    name: formData.get('name'),
    sort_order: formData.get('sort_order'),
  })
  if (!parsed.success) {
    return { error: issuesToMessage(parsed.error) }
  }

  const { error } = await supabase
    .from('stock_categories')
    .insert(parsed.data)
  if (error) {
    return { error: 'Erro ao criar categoria' }
  }

  revalidatePath('/dashboard/stock/categorias')
  return {}
}

export async function updateCategory(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await getTeamClient()
  if (!supabase) {
    return { error: 'Sem permissões de equipa' }
  }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) {
    return { error: 'Categoria inválida' }
  }

  const parsed = categorySchema.safeParse({
    name: formData.get('name'),
    sort_order: formData.get('sort_order'),
  })
  if (!parsed.success) {
    return { error: issuesToMessage(parsed.error) }
  }

  const { error } = await supabase
    .from('stock_categories')
    .update(parsed.data)
    .eq('id', id.data)
  if (error) {
    return { error: 'Erro ao atualizar categoria' }
  }

  revalidatePath('/dashboard/stock/categorias')
  return {}
}

export async function deleteCategory(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await getTeamClient()
  if (!supabase) {
    return { error: 'Sem permissões de equipa' }
  }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) {
    return { error: 'Categoria inválida' }
  }

  const { error } = await supabase
    .from('stock_categories')
    .delete()
    .eq('id', id.data)
  if (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return { error: 'Categoria em uso' }
    }
    return { error: 'Erro ao apagar categoria' }
  }

  revalidatePath('/dashboard/stock/categorias')
  return {}
}
