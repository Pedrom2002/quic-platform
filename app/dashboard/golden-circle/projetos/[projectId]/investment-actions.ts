'use server'

import { revalidatePath } from 'next/cache'

import { requireOrgAuth } from '@/lib/supabase/actions'
import { investmentSchema } from '@/lib/golden-circle/validation'

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
    project_id: projectId,
    amount_cents: parsed.data.amount_cents,
    invested_at: parsed.data.invested_at,
    projected_return_cents: parsed.data.projected_return_cents,
    status: 'active',
  })
  if (error) return { error: 'Erro ao registar investimento' }

  revalidatePath(`/dashboard/golden-circle/projetos/${projectId}`)
  return {}
}
