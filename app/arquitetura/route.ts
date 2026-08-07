import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Documento de arquitetura interno. Servido a partir de content/ (fora de
// public/) precisamente para que o ficheiro nunca seja acessível por URL
// direto sem passar primeiro por esta verificação de sessão.
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth/login?next=/arquitetura', request.url))

  const { data: member } = await supabase
    .from('team_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .single()
  if (!member) return NextResponse.redirect(new URL('/auth/login?next=/arquitetura', request.url))

  const filePath = path.join(process.cwd(), 'content', 'arquitetura.html')
  const html = await readFile(filePath, 'utf8')

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
