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

  // Normalize and dedupe within the batch itself
  const seen = new Set<string>()
  const normalized = parsed.data.contacts
    .map(c => ({ ...c, email: c.email.trim().toLowerCase() }))
    .filter(c => {
      const key = `${c.list_id}|${c.email}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  // Detect cross-list duplicates and unsubscribed/bounced contacts
  const emails = [...new Set(normalized.map(c => c.email))]
  const { data: existing } = await supabase
    .from('marketing_contacts')
    .select('email, status, list_id')
    .in('email', emails)

  const blockedEmails = new Set(
    (existing ?? [])
      .filter(e => e.status === 'unsubscribed' || e.status === 'bounced')
      .map(e => e.email)
  )

  const targetListId = normalized[0]?.list_id
  const inTargetList = new Set(
    (existing ?? [])
      .filter(e => e.list_id === targetListId)
      .map(e => e.email)
  )
  const inOtherLists = new Set(
    (existing ?? [])
      .filter(e => e.list_id !== targetListId)
      .map(e => e.email)
  )

  const toInsert = normalized.filter(c => !blockedEmails.has(c.email))

  const { error } = await supabase.from('marketing_contacts')
    .upsert(toInsert, { onConflict: 'list_id,email', ignoreDuplicates: true })

  if (error) {
    console.error('[marketing/contacts/import]', error.message)
    return NextResponse.json({ error: 'Erro ao importar contactos' }, { status: 500 })
  }

  return NextResponse.json({
    submitted: parsed.data.contacts.length,
    after_batch_dedup: normalized.length,
    skipped_blocked: blockedEmails.size,
    already_in_list: inTargetList.size,
    duplicate_in_other_lists: inOtherLists.size,
    inserted_or_existing: toInsert.length,
  })
}
