'use server'

import { requireOrgAuth } from '@/lib/supabase/actions'
import { messageTemplateSchema, type MessageTemplateInput } from '@/schemas/template.schema'

export async function loadMessageTemplatesAction() {
  const { supabase, member } = await requireOrgAuth()

  const { data } = await supabase
    .from('message_templates')
    .select('*')
    .eq('organization_id', member.organization_id)
    .eq('is_active', true)
    .order('name')
  return data ?? []
}

export async function createMessageTemplateAction(input: MessageTemplateInput) {
  const parsed = messageTemplateSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.issues[0].message)

  const { supabase, member } = await requireOrgAuth()

  const { error } = await supabase
    .from('message_templates')
    .insert({ ...parsed.data, organization_id: member.organization_id })
  if (error) throw new Error(error.message)
}

export async function updateMessageTemplateAction(id: string, input: MessageTemplateInput) {
  const parsed = messageTemplateSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.issues[0].message)

  const { supabase, member } = await requireOrgAuth()

  const { data: existing } = await supabase
    .from('message_templates')
    .select('id')
    .eq('id', id)
    .eq('organization_id', member.organization_id)
    .single()
  if (!existing) throw new Error('Template não encontrado')

  const { error } = await supabase
    .from('message_templates')
    .update(parsed.data)
    .eq('id', id)
    .eq('organization_id', member.organization_id)
  if (error) throw new Error(error.message)
}

export async function deactivateMessageTemplateAction(id: string) {
  const { supabase, member } = await requireOrgAuth()

  const { data: existing } = await supabase
    .from('message_templates')
    .select('id')
    .eq('id', id)
    .eq('organization_id', member.organization_id)
    .single()
  if (!existing) throw new Error('Template não encontrado')

  const { error } = await supabase
    .from('message_templates')
    .update({ is_active: false })
    .eq('id', id)
    .eq('organization_id', member.organization_id)
  if (error) throw new Error(error.message)
}
