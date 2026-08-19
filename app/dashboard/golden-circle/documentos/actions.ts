'use server'

import { revalidatePath } from 'next/cache'

import { requireOrgAuth } from '@/lib/supabase/actions'
import { documentSchema } from '@/lib/golden-circle/validation'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, detectMimeFromMagic, isMimeMismatch, safeBlobPathname } from '@/schemas/file.schema'
import { getEnv } from '@/lib/env'
import { put } from '@vercel/blob'

export type ActionResult = { error?: string }

async function getOrgClient() {
  try {
    return await requireOrgAuth()
  } catch {
    return null
  }
}

function optionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key)
  return value ? String(value) : null
}

export async function createDocument(formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const parsed = documentSchema.safeParse({
    title: formData.get('title'),
    type: formData.get('type'),
    investor_id: optionalText(formData, 'investor_id'),
    project_id: optionalText(formData, 'project_id'),
  })
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join('; ') }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { error: 'Seleciona um ficheiro' }
  if (file.size > MAX_FILE_SIZE) return { error: 'Ficheiro demasiado grande (máx. 50 MB)' }
  if (!ALLOWED_MIME_TYPES.has(file.type)) return { error: 'Tipo de ficheiro não suportado' }

  const detected = await detectMimeFromMagic(file)
  if (isMimeMismatch(file.type, detected)) {
    return { error: 'O conteúdo do ficheiro não corresponde ao tipo declarado' }
  }

  const token = getEnv().BLOB_READ_WRITE_TOKEN
  if (!token) return { error: 'Upload de ficheiros não configurado' }

  const blob = await put(safeBlobPathname(file.name), file, { access: 'public', token })

  const { error } = await auth.supabase.from('investor_documents').insert({
    title: parsed.data.title,
    type: parsed.data.type,
    investor_id: parsed.data.investor_id ?? null,
    project_id: parsed.data.project_id ?? null,
    file_url: blob.url,
  })
  if (error) return { error: 'Erro ao guardar o documento' }

  revalidatePath('/dashboard/golden-circle/documentos')
  if (parsed.data.project_id) revalidatePath(`/dashboard/golden-circle/projetos/${parsed.data.project_id}`)
  if (parsed.data.investor_id) revalidatePath(`/dashboard/golden-circle/investidores/${parsed.data.investor_id}`)
  return {}
}
