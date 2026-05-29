'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createList(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  await supabase.from('marketing_lists').insert({
    name: formData.get('name') as string,
    created_by: user.id,
  })

  revalidatePath('/dashboard/marketing/contacts')
}

export async function addContact(
  _prev: { ok: boolean; message: string } | null,
  formData: FormData
): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Não autenticado' }

  const list_id = formData.get('list_id') as string
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const name = (formData.get('name') as string)?.trim() || null
  const company = (formData.get('company') as string)?.trim() || null
  const role = (formData.get('role') as string)?.trim() || null

  if (!email || !email.includes('@')) {
    return { ok: false, message: 'Email inválido' }
  }

  const { error } = await supabase.from('marketing_contacts').insert({
    list_id, email, name, company, role,
  })

  if (error) {
    if (error.code === '23505') return { ok: false, message: 'Email já existe nesta lista' }
    return { ok: false, message: error.message }
  }

  revalidatePath('/dashboard/marketing/contacts')
  return { ok: true, message: `${email} adicionado` }
}

export async function deleteContact(contactId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  await supabase.from('marketing_contacts').delete().eq('id', contactId)
  revalidatePath('/dashboard/marketing/contacts')
  return { ok: true }
}
