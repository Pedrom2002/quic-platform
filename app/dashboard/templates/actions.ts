'use server'

import { createClient } from '@/lib/supabase/server'
import { messageTemplateSchema, type MessageTemplateInput } from '@/schemas/template.schema'

async function resolveOrgMember(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('auth_user_id', userId)
    .single()
  return data
}

export async function loadMessageTemplatesAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

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
  if (!parsed.success) throw new Error(parsed.error.errors[0].message)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  const { error } = await supabase
    .from('message_templates')
    .insert({ ...parsed.data, organization_id: member.organization_id })
  if (error) throw new Error(error.message)
}

export async function updateMessageTemplateAction(id: string, input: MessageTemplateInput) {
  const parsed = messageTemplateSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.errors[0].message)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

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
