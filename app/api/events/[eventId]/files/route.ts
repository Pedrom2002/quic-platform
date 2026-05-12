import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { createClient } from '@/lib/supabase/server'
import {
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  detectMimeFromMagic,
  isMimeMismatch,
  safeBlobPathname,
} from '@/schemas/file.schema'
import { audit } from '@/lib/audit'
import type { EventFileWithUploader } from '@/types/app'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: member } = await supabase
    .from('team_members')
    .select('id, organization_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return NextResponse.json({ error: 'Ficheiro inválido' }, { status: 400 })
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Ficheiro demasiado grande (máx. 50 MB)' }, { status: 413 })

  const declaredMime = file.type || ''
  if (!ALLOWED_MIME_TYPES.has(declaredMime)) {
    return NextResponse.json({ error: 'Tipo de ficheiro não permitido' }, { status: 415 })
  }

  const detectedMime = await detectMimeFromMagic(file)
  if (isMimeMismatch(declaredMime, detectedMime)) {
    return NextResponse.json({ error: 'Conteúdo do ficheiro não corresponde ao tipo declarado' }, { status: 415 })
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) return NextResponse.json({ error: 'Armazenamento não configurado' }, { status: 503 })

  const blob = await put(safeBlobPathname(file.name), file, { access: 'public', token })

  const { data } = await supabase
    .from('event_files')
    .insert({
      event_id: eventId,
      organization_id: member.organization_id,
      uploaded_by: member.id,
      file_name: file.name.slice(0, 255),
      file_size: file.size,
      mime_type: declaredMime,
      blob_url: blob.url,
      blob_pathname: blob.pathname,
    })
    .select('*, uploader:team_members!uploaded_by(id, full_name, avatar_url)')
    .returns<EventFileWithUploader[]>()
    .single()

  if (!data) return NextResponse.json({ error: 'Erro ao guardar ficheiro' }, { status: 500 })

  audit({
    action: 'file.uploaded',
    userId: user.id,
    organizationId: member.organization_id,
    eventId,
    meta: { fileId: data.id, fileName: file.name.slice(0, 255), mimeType: declaredMime, fileSize: file.size },
  })

  return NextResponse.json({ file: data }, { status: 201 })
}
