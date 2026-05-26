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
