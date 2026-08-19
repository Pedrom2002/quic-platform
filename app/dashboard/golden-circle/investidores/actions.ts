'use server'

import { revalidatePath } from 'next/cache'
import * as z from 'zod'

import { requireOrgAuthFull } from '@/lib/supabase/actions'

export type ActionResult = { error?: string }

async function getOrgClient() {
  try {
    return await requireOrgAuthFull()
  } catch {
    return null
  }
}

async function setInvestorStatus(formData: FormData, status: 'approved' | 'rejected'): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: 'Investidor inválido' }

  const { error } = await auth.supabase
    .from('investors')
    .update({
      status,
      approved_at: new Date().toISOString(),
      approved_by_team_member_id: auth.member.id,
    })
    .eq('id', id.data)
    .eq('organization_id', auth.member.organization_id)

  if (error) return { error: 'Erro ao atualizar o investidor' }

  revalidatePath('/dashboard/golden-circle/investidores')
  return {}
}

export async function approveInvestor(formData: FormData): Promise<ActionResult> {
  return setInvestorStatus(formData, 'approved')
}

export async function rejectInvestor(formData: FormData): Promise<ActionResult> {
  return setInvestorStatus(formData, 'rejected')
}
