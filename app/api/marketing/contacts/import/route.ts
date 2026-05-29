import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  contacts: z.array(z.object({
    list_id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().optional(),
    company: z.string().optional(),
    role: z.string().optional(),
  })).max(1000),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Inválido' }, { status: 400 })

  const { error } = await supabase.from('marketing_contacts')
    .upsert(parsed.data.contacts, { onConflict: 'list_id,email', ignoreDuplicates: true })

  if (error) {
    console.error('[marketing/contacts/import]', error.message)
    return NextResponse.json({ error: 'Erro ao importar contactos' }, { status: 500 })
  }

  return NextResponse.json({ imported: parsed.data.contacts.length })
}
