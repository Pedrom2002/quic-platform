'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  fullName: z.string().min(1, 'Nome é obrigatório.'),
  phone: z.string().optional(),
})

export async function updateProfile(formData: FormData): Promise<{ error?: string }> {
  const parsed = schema.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone') || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Não foi possível guardar as alterações. Tenta novamente.' }
  }

  const { error } = await supabase
    .from('investors')
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone ?? null,
    })
    .eq('auth_user_id', user.id)

  if (error) {
    return { error: 'Não foi possível guardar as alterações. Tenta novamente.' }
  }

  revalidatePath('/investors/profile')
  return {}
}
