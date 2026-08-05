'use server'

import { createClient } from '@/lib/supabase/server'
import { requireOrgAuth } from '@/lib/supabase/actions'
import { isContactVisibleToMember } from '@/lib/contacts/visibility'
import type { Tables } from '@/types/database'

export { isContactVisibleToMember }

// ---- Types ----

export type ContactGroup = Tables<'contact_groups'>

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

export type ContactsPage = {
  contacts: ContactWithGroups[]
  nextCursor: { name: string; id: string } | null
}

export type GroupCounts = {
  total: number
  ungrouped: number
  byGroup: Record<string, number>
}

const CONTACTS_PAGE_SIZE = 100
const UNGROUPED_SENTINEL = '00000000-0000-0000-0000-000000000000'

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

// Loads one page of contacts via the list_contacts_page RPC (0058), which
// applies visibility + group filtering in SQL so pagination is exact (a page
// of N never comes back short because of a JS-side filter afterward).
export async function loadContactsPageAction(
  groupId?: string | null,
  cursor?: { name: string; id: string } | null
): Promise<ContactsPage> {
  const { supabase, member } = await requireOrgAuth()
  const isAdmin = member.role === 'admin'

  const { data: rows, error } = await supabase.rpc('list_contacts_page', {
    p_is_admin: isAdmin,
    p_group_id: groupId ?? null,
    p_cursor_name: cursor?.name ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_limit: CONTACTS_PAGE_SIZE,
  })
  if (error) throw new Error(error.message)

  const clientRows = (rows ?? []) as Array<{
    id: string; full_name: string; email: string | null; phone: string | null
    company: string | null; notes: string | null; is_active: boolean; created_at: string
  }>

  if (clientRows.length === 0) return { contacts: [], nextCursor: null }

  // Batch-load groups for this page's contacts (single query, avoids N+1).
  const contactIds = clientRows.map(r => r.id)
  const { data: memberRows } = await supabase
    .from('contact_group_members')
    .select('contact_id, contact_groups ( id, name, color, admin_only )')
    .in('contact_id', contactIds)

  type GroupRef = { id: string; name: string; color: string | null; admin_only: boolean }
  const groupsByContact = new Map<string, GroupRef[]>()
  for (const row of (memberRows ?? []) as Array<{ contact_id: string; contact_groups: GroupRef | GroupRef[] | null }>) {
    const groups = Array.isArray(row.contact_groups)
      ? row.contact_groups
      : row.contact_groups ? [row.contact_groups] : []
    const existing = groupsByContact.get(row.contact_id) ?? []
    groupsByContact.set(row.contact_id, existing.concat(groups))
  }

  const contacts: ContactWithGroups[] = clientRows.map(row => ({
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    notes: row.notes,
    is_active: row.is_active,
    created_at: row.created_at,
    groups: groupsByContact.get(row.id) ?? [],
  }))

  const last = clientRows[clientRows.length - 1]
  const nextCursor = clientRows.length === CONTACTS_PAGE_SIZE
    ? { name: last.full_name, id: last.id }
    : null

  return { contacts, nextCursor }
}

// Aggregated counts (total / ungrouped / per-group) via the
// contact_group_counts RPC (0059) - independent of what's currently loaded
// in the paginated list, so they stay accurate as more pages load.
export async function loadGroupCountsAction(): Promise<GroupCounts> {
  const { supabase, member } = await requireOrgAuth()
  const isAdmin = member.role === 'admin'

  const { data, error } = await supabase.rpc('contact_group_counts', {
    p_is_admin: isAdmin,
  })
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as Array<{ group_id: string | null; contact_count: number }>
  const result: GroupCounts = { total: 0, ungrouped: 0, byGroup: {} }
  for (const row of rows) {
    if (row.group_id === null) result.total = row.contact_count
    else if (row.group_id === UNGROUPED_SENTINEL) result.ungrouped = row.contact_count
    else result.byGroup[row.group_id] = row.contact_count
  }
  return result
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
