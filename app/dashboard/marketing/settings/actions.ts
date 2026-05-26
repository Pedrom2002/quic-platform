'use server'

import { createClient } from '@/lib/supabase/server'
import { encryptPassword } from '@/lib/marketing/crypto'
import { testSmtpConnection } from '@/lib/marketing/smtp'

export async function saveSmtpCredentials(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const passwordEnc = encryptPassword(formData.get('password') as string)

  await supabase.from('team_smtp_credentials').upsert({
    user_id: user.id,
    host: formData.get('host') as string,
    port: parseInt(formData.get('port') as string, 10),
    username: formData.get('username') as string,
    password_enc: passwordEnc,
    from_name: formData.get('from_name') as string,
    verified_at: null,
  }, { onConflict: 'user_id' })
}

export async function testSmtpCredentials(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Não autenticado' }

  const { data: creds } = await supabase
    .from('team_smtp_credentials')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!creds) return { ok: false, error: 'Credenciais não guardadas' }

  try {
    await testSmtpConnection(creds)
    await supabase.from('team_smtp_credentials')
      .update({ verified_at: new Date().toISOString() })
      .eq('user_id', user.id)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }
}
