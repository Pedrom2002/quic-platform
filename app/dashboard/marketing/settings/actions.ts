'use server'

import { revalidatePath } from 'next/cache'
import { getOrgAuth } from '@/lib/supabase/actions'
import { encryptPassword } from '@/lib/marketing/crypto'
import { testSmtpConnection } from '@/lib/marketing/smtp'

export async function saveSmtpCredentials(
  _prev: { ok: boolean; message: string } | null,
  formData: FormData
): Promise<{ ok: boolean; message: string }> {
  const auth = await getOrgAuth()
  if (!auth) return { ok: false, message: 'Não autorizado' }
  const { supabase, user } = auth

  const password = formData.get('password') as string
  const host = formData.get('host') as string
  const port = parseInt(formData.get('port') as string, 10)
  const username = formData.get('username') as string
  const from_name = formData.get('from_name') as string

  const passwordEnc = encryptPassword(password)

  const { error: upsertErr } = await supabase.from('team_smtp_credentials').upsert({
    user_id: user.id,
    host,
    port,
    username,
    password_enc: passwordEnc,
    from_name,
    verified_at: null,
  }, { onConflict: 'user_id' })

  if (upsertErr) return { ok: false, message: `Erro ao guardar: ${upsertErr.message}` }

  try {
    await testSmtpConnection({ host, port, username, password_enc: passwordEnc, from_name })
    await supabase.from('team_smtp_credentials')
      .update({ verified_at: new Date().toISOString() })
      .eq('user_id', user.id)
    revalidatePath('/dashboard/marketing/settings')
    return { ok: true, message: 'Guardado e verificado com sucesso' }
  } catch (err) {
    revalidatePath('/dashboard/marketing/settings')
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return { ok: true, message: `Guardado, mas a verificação falhou: ${msg}` }
  }
}

export async function testSmtpCredentials(): Promise<{ ok: boolean; error?: string }> {
  const auth = await getOrgAuth()
  if (!auth) return { ok: false, error: 'Não autorizado' }
  const { supabase, user } = auth

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
    revalidatePath('/dashboard/marketing/settings')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }
}
