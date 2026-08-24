'use server'

import { revalidatePath } from 'next/cache'
import * as z from 'zod'

import { requireOrgAuth } from '@/lib/supabase/actions'
import { investmentSchema, investmentUpdateSchema } from '@/lib/golden-circle/validation'

export type ActionResult = { error?: string }

async function getOrgClient() {
  try {
    return await requireOrgAuth()
  } catch {
    return null
  }
}

function optionalNumber(formData: FormData, key: string): number | null {
  const value = formData.get(key)
  if (!value) return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

export async function createInvestment(projectId: string, formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const projectIdParsed = z.uuid().safeParse(projectId)
  if (!projectIdParsed.success) return { error: 'Projeto inválido' }

  const { data: project } = await auth.supabase
    .from('investment_projects')
    .select('id')
    .eq('id', projectIdParsed.data)
    .eq('organization_id', auth.member.organization_id)
    .single()
  if (!project) return { error: 'Projeto inválido' }

  const parsed = investmentSchema.safeParse({
    investor_id: formData.get('investor_id'),
    amount_cents: Number(formData.get('amount_cents')),
    invested_at: formData.get('invested_at'),
    projected_return_cents: optionalNumber(formData, 'projected_return_cents'),
  })
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join('; ') }

  // Confirma que o investidor pertence a esta org e está aprovado, antes de
  // registar o investimento — evita ligar dinheiro a um investidor de outra
  // organização ou ainda pendente de aprovação.
  const { data: investor } = await auth.supabase
    .from('investors')
    .select('id')
    .eq('id', parsed.data.investor_id)
    .eq('organization_id', auth.member.organization_id)
    .eq('status', 'approved')
    .single()
  if (!investor) return { error: 'Investidor inválido ou não aprovado' }

  const { error } = await auth.supabase.from('investments').insert({
    investor_id: parsed.data.investor_id,
    project_id: projectIdParsed.data,
    amount_cents: parsed.data.amount_cents,
    invested_at: parsed.data.invested_at,
    projected_return_cents: parsed.data.projected_return_cents,
    status: 'active',
  })
  if (error) return { error: 'Erro ao registar investimento' }

  revalidatePath(`/dashboard/golden-circle/projetos/${projectIdParsed.data}`)
  return {}
}

export async function updateInvestment(
  projectId: string,
  investmentId: string,
  formData: FormData
): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const projectIdParsed = z.uuid().safeParse(projectId)
  const investmentIdParsed = z.uuid().safeParse(investmentId)
  if (!projectIdParsed.success || !investmentIdParsed.success) return { error: 'Pedido inválido' }

  const { data: project } = await auth.supabase
    .from('investment_projects')
    .select('id')
    .eq('id', projectIdParsed.data)
    .eq('organization_id', auth.member.organization_id)
    .single()
  if (!project) return { error: 'Projeto inválido' }

  // Confirma que o investimento pertence a este projeto antes de o alterar
  // — sem isto, um investmentId de outro projeto/organização podia ser
  // editado desde que o pedido passasse um projectId válido para esta org.
  const { data: existingInvestment } = await auth.supabase
    .from('investments')
    .select('id')
    .eq('id', investmentIdParsed.data)
    .eq('project_id', projectIdParsed.data)
    .single()
  if (!existingInvestment) return { error: 'Investimento inválido' }

  const parsed = investmentUpdateSchema.safeParse({
    amount_cents: Number(formData.get('amount_cents')),
    invested_at: formData.get('invested_at'),
    status: formData.get('status'),
    projected_return_cents: optionalNumber(formData, 'projected_return_cents'),
    realized_return_cents: optionalNumber(formData, 'realized_return_cents'),
  })
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join('; ') }

  const { error } = await auth.supabase
    .from('investments')
    .update({
      amount_cents: parsed.data.amount_cents,
      invested_at: parsed.data.invested_at,
      status: parsed.data.status,
      projected_return_cents: parsed.data.projected_return_cents,
      realized_return_cents: parsed.data.realized_return_cents,
    })
    .eq('id', investmentIdParsed.data)
  if (error) return { error: 'Erro ao atualizar investimento' }

  revalidatePath(`/dashboard/golden-circle/projetos/${projectIdParsed.data}`)
  return {}
}
