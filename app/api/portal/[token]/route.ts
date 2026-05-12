import { NextResponse } from 'next/server'
import { getPortalData } from '@/lib/portal/data'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  let data
  try {
    data = await getPortalData(token)
  } catch (err) {
    console.error('[portal] getPortalData threw:', err)
    return NextResponse.json({ error: 'Erro interno', detail: String(err) }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 401 })
  }

  return NextResponse.json({
    event: data.event,
    items: data.items,
    progress: data.progress,
  })
}
