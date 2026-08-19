'use server'

import { revalidatePath } from 'next/cache'
import * as z from 'zod'

import { requireOrgAuth } from '@/lib/supabase/actions'
import { projectSchema } from '@/lib/golden-circle/validation'

export type ActionResult = { error?: string }

async function getOrgClient() {
  try {
    return await requireOrgAuth()
  } catch {
    return null
  }
}

function issuesToMessage(error: z.ZodError) {
  return error.issues.map((issue) => issue.message).join('; ')
}

function optionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key)
  return value ? String(value) : null
}

function optionalNumber(formData: FormData, key: string): number | null {
  const value = formData.get(key)
  if (!value) return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

function parseProjectForm(formData: FormData) {
  return projectSchema.safeParse({
    name: formData.get('name'),
    description: optionalText(formData, 'description'),
    status: formData.get('status'),
    funding_goal_cents: Number(formData.get('funding_goal_cents')),
    capacity: optionalNumber(formData, 'capacity'),
    investment_deadline: optionalText(formData, 'investment_deadline'),
    actual_revenue_cents: optionalNumber(formData, 'actual_revenue_cents'),
    attendance: optionalNumber(formData, 'attendance'),
  })
}

export async function createProject(formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const parsed = parseProjectForm(formData)
  if (!parsed.success) return { error: issuesToMessage(parsed.error) }

  const { error } = await auth.supabase.from('investment_projects').insert({
    ...parsed.data,
    organization_id: auth.member.organization_id,
  })
  if (error) return { error: 'Erro ao criar projeto' }

  revalidatePath('/dashboard/golden-circle/projetos')
  return {}
}

export async function updateProject(formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: 'Projeto inválido' }

  const parsed = parseProjectForm(formData)
  if (!parsed.success) return { error: issuesToMessage(parsed.error) }

  const { error } = await auth.supabase
    .from('investment_projects')
    .update(parsed.data)
    .eq('id', id.data)
    .eq('organization_id', auth.member.organization_id)
  if (error) return { error: 'Erro ao atualizar projeto' }

  revalidatePath('/dashboard/golden-circle/projetos')
  revalidatePath(`/dashboard/golden-circle/projetos/${id.data}`)
  return {}
}
