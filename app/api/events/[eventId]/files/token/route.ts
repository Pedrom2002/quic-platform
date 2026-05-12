import { NextResponse } from 'next/server'
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client'
import { createClient } from '@/lib/supabase/server'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, safeBlobPathname } from '@/schemas/file.schema'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename') ?? 'upload'
    const mimeType = searchParams.get('mimeType') ?? ''

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

    if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json({ error: 'Tipo de ficheiro não permitido' }, { status: 415 })
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN
    if (!blobToken) return NextResponse.json({ error: 'Armazenamento não configurado' }, { status: 503 })

    const pathname = safeBlobPathname(filename)
    const clientToken = await generateClientTokenFromReadWriteToken({
      token: blobToken,
      pathname,
      allowedContentTypes: [...ALLOWED_MIME_TYPES],
      maximumSizeInBytes: MAX_FILE_SIZE,
    })

    return NextResponse.json({ token: clientToken, pathname })
  } catch (err) {
    console.error('[files/token]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
