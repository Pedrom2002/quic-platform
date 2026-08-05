import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Documento de arquitetura interno. Servido a partir de content/ (fora de
// public/) precisamente para que o ficheiro nunca seja acessível por URL
// direto sem passar primeiro por esta verificação de sessão.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/arquitetura')

  const { data: member } = await supabase
    .from('team_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .single()
  if (!member) redirect('/auth/login?next=/arquitetura')

  const filePath = path.join(process.cwd(), 'content', 'arquitetura.html')
  const html = await readFile(filePath, 'utf8')

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
