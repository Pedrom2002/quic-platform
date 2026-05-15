'use server'

import { createClient } from '@/lib/supabase/server'
import { requireOrgAuth } from '@/lib/supabase/actions'
import { isContactVisibleToMember } from '@/lib/contacts/visibility'

export { isContactVisibleToMember }

// ---- Types ----

export type ContactGroup = {
  id: string
  organization_id: string
  name: string
  description: string | null
  color: string | null
  icon: string | null
  admin_only: boolean
  created_at: string
}

export type ContactWithGroups = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  company: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  groups: Array<{ id: string; name: string; color: string | null; admin_only: boolean }>
}

// ---- Groups ----

export async function loadGroupsAction(): Promise<ContactGroup[]> {
  const { supabase, member } = await requireOrgAuth()

  let query = supabase
    .from('contact_groups')
    .select('*')
    .eq('organization_id', member.organization_id)
    .order('name')

  if (member.role !== 'admin') {
    query = query.eq('admin_only', false)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createGroupAction(input: {
  name: string
  description?: string
  color?: string
  icon?: string
  admin_only?: boolean
}): Promise<ContactGroup> {
  if (!input.name.trim()) throw new Error('Nome obrigatório')

  const { supabase, member } = await requireOrgAuth()

  // Members cannot create admin_only groups
  const admin_only = member.role === 'admin' ? (input.admin_only ?? false) : false

  const { data, error } = await supabase
    .from('contact_groups')
    .insert({
      organization_id: member.organization_id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      color: input.color || null,
      icon: input.icon || null,
      admin_only,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateGroupAction(
  groupId: string,
  input: { name?: string; description?: string; color?: string; icon?: string; admin_only?: boolean }
): Promise<void> {
  const { supabase, member } = await requireOrgAuth()
  if (member.role !== 'admin') throw new Error('Sem permissão')

  const { error } = await supabase
    .from('contact_groups')
    .update({
      ...(input.name && { name: input.name.trim() }),
      description: input.description?.trim() || null,
      color: input.color || null,
      icon: input.icon || null,
      ...(typeof input.admin_only === 'boolean' && { admin_only: input.admin_only }),
    })
    .eq('id', groupId)
    .eq('organization_id', member.organization_id)

  if (error) throw new Error(error.message)
}

export async function deleteGroupAction(groupId: string): Promise<void> {
  const { supabase, member } = await requireOrgAuth()
  if (member.role !== 'admin') throw new Error('Sem permissão')

  const { error } = await supabase
    .from('contact_groups')
    .delete()
    .eq('id', groupId)
    .eq('organization_id', member.organization_id)

  if (error) throw new Error(error.message)
}

// ---- Contacts ----

export async function loadContactsAction(groupId?: string | null): Promise<ContactWithGroups[]> {
  const { supabase, member } = await requireOrgAuth()

  const isAdmin = member.role === 'admin'

  // Load contacts with their groups
  const { data, error } = await supabase
    .from('clients')
    .select(`
      id, full_name, email, phone, company, notes, is_active, created_at,
      contact_group_members (
        contact_groups ( id, name, color, admin_only )
      )
    `)
    .eq('organization_id', member.organization_id)
    .eq('is_active', true)
    .order('full_name')

  if (error) throw new Error(error.message)

  type GroupRef = { id: string; name: string; color: string | null; admin_only: boolean }
  type ClientRow = {
    id: string; full_name: string; email: string | null; phone: string | null
    company: string | null; notes: string | null; is_active: boolean; created_at: string
    contact_group_members: Array<{ contact_groups: GroupRef | GroupRef[] | null }>
  }

  const contacts: ContactWithGroups[] = ((data ?? []) as unknown as ClientRow[]).map((row) => {
    const groups = row.contact_group_members
      .flatMap((m) => (Array.isArray(m.contact_groups) ? m.contact_groups : m.contact_groups ? [m.contact_groups] : []))
      .filter((g): g is GroupRef => g !== null)
    return {
      id: row.id,
      full_name: row.full_name,
      email: row.email,
      phone: row.phone,
      company: row.company,
      notes: row.notes,
      is_active: row.is_active,
      created_at: row.created_at,
      groups,
    }
  })

  // Apply visibility filter for non-admins
  const visible = isAdmin
    ? contacts
    : contacts.filter(c => isContactVisibleToMember(c.groups))

  // Apply group filter if requested
  if (groupId === 'none') {
    return visible.filter(c => c.groups.length === 0)
  }
  if (groupId) {
    return visible.filter(c => c.groups.some(g => g.id === groupId))
  }

  return visible
}

export async function createContactAction(input: {
  full_name: string
  email?: string
  phone?: string
  groupIds?: string[]
}): Promise<string> {
  if (!input.full_name.trim()) throw new Error('Nome obrigatório')

  const { supabase, member } = await requireOrgAuth()

  const { data, error } = await supabase
    .from('clients')
    .insert({
      organization_id: member.organization_id,
      full_name: input.full_name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  if (input.groupIds?.length) {
    const groupIds = input.groupIds
    if (member.role !== 'admin') {
      const { data: groups } = await supabase
        .from('contact_groups')
        .select('id, admin_only')
        .in('id', groupIds)
        .eq('organization_id', member.organization_id)

      const forbidden = (groups ?? []).some(g => g.admin_only)
      if (forbidden) throw new Error('Sem permissão para adicionar a grupo admin')
    }

    const { error: memberError } = await supabase
      .from('contact_group_members')
      .insert(groupIds.map(gid => ({ group_id: gid, contact_id: data.id })))

    if (memberError) throw new Error(memberError.message)
  }

  return data.id
}

export async function updateContactAction(
  contactId: string,
  updates: { full_name: string; email: string; phone: string; company: string }
): Promise<void> {
  if (!updates.full_name.trim()) throw new Error('Nome obrigatório')

  const { supabase, member } = await requireOrgAuth()

  const { error } = await supabase
    .from('clients')
    .update({
      full_name: updates.full_name.trim(),
      email: updates.email.trim() || null,
      phone: updates.phone.trim() || null,
      company: updates.company.trim() || null,
    })
    .eq('id', contactId)
    .eq('organization_id', member.organization_id)

  if (error) throw new Error(error.message)
}

export async function deactivateContactAction(contactId: string): Promise<void> {
  const { supabase, member } = await requireOrgAuth()

  const { error } = await supabase
    .from('clients')
    .update({ is_active: false })
    .eq('id', contactId)
    .eq('organization_id', member.organization_id)

  if (error) throw new Error(error.message)
}

export async function syncContactGroupsAction(
  contactId: string,
  groupIds: string[]
): Promise<void> {
  const { supabase, member } = await requireOrgAuth()

  if (member.role !== 'admin' && groupIds.length > 0) {
    const { data: groups } = await supabase
      .from('contact_groups')
      .select('id, admin_only')
      .in('id', groupIds)
      .eq('organization_id', member.organization_id)
    if ((groups ?? []).some(g => g.admin_only)) throw new Error('Sem permissão')
  }

  // Verify contact belongs to this org
  const { data: contactCheck } = await supabase
    .from('clients')
    .select('id')
    .eq('id', contactId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!contactCheck) throw new Error('Contacto não encontrado')

  // Delete all existing memberships then re-insert
  await supabase.from('contact_group_members').delete().eq('contact_id', contactId)

  if (groupIds.length > 0) {
    const { error } = await supabase
      .from('contact_group_members')
      .insert(groupIds.map(gid => ({ group_id: gid, contact_id: contactId })))
    if (error) throw new Error(error.message)
  }
}
