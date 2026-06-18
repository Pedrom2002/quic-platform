import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALL_URLS = [
  'https://www.agendalx.pt/events/event/santos-a-campolide/',
  'https://www.jf-campolide.pt/2026/05/18/santos-a-campolide-2026-um-nome-que-dispensa-apresentacoes/',
  'https://aondevamos.pt/lisboa/festas-e-festivais/santos-a-campolide/',
  'https://www.instagram.com/p/DYPhy1hI3t7/',
  'https://www.facebook.com/jfcampolide/?locale=pt_PT',
  'https://ondebus.pt/eventos/santos-a-campolide-2026/',
  'https://www.timeout.pt/lisboa/pt/coisas-para-fazer/santos-a-campolide',
  'https://lisboa.events/eventos/santos-a-campolide-2026-1f155c65/',
  'https://www.e-cultura.pt/evento/54811',
  'https://lisboasecreta.co/santos-populares-lisboa-campolide/',
  'https://santosdelisboa.pt/santos-populares-em-lisboa/',
  'https://www.viralagenda.com/pt/events/1803064/santos-a-campolide-2026',
  'https://www.mysound-mag.com/2023/04/arraial-de-campolide-lisboa.html',
  'https://cartazculturallisboa.pt/evento/santamaria-prometem-incendiar-o-santos-a-campolide-2026/',
  'https://agendadeconcertos.com/festa/arraial-de-campolide/',
  'https://www.tempo.pt/noticias/lazer/ja-ha-data-para-os-melhores-arraiais-de-lisboa.html',
  'https://santos-lisboa.com/arraial/17',
  'https://magg.sapo.pt/atualidade/artigos/os-12-melhores-arraiais-de-lisboa-o-guia-para-saber-onde-ir-o-que-fazer-e-quem-ouvir-a-cada-dia',
  'https://www.nit.pt/fora-de-casa/na-cidade/os-12-melhores-arraiais-para-celebrar-os-santos-populares-em-lisboa-2',
  'https://www.flash.pt/weekend/detalhe/o-pontape-de-saida-vai-ser-dado-neste-fim-de-semana-lisboa-entra-oficialmente-em-modo-santos',
  'https://sapo.pt/artigo/arraiais-populares-em-lisboa-o-guia-que-o-vai-orientar-ao-longo-do-mes-de-junho-69c403c3bf28b00493359f7e',
  'https://sapo.pt/artigo/santos-populares-2026-veja-11-festas-ja-confirmadas-em-portugal-6a14233614f3d731cfbaf901',
  'https://www.walk-n-roll-tours.com/post/die-festas-de-lisboa-2026-das-programm-der-lissabonner-stadtfeste',
  'https://www.coolture.pt/event/santos-campolide-arraiais-santos-populares-festaslisboa18/',
  'https://pt.euronews.com/cultura/2026/06/10/nao-ha-lisboa-sem-santos-os-principais-arraiais-dos-santos-populares-na-capital-portuguesa',
  'https://festasearraiais.pt/eventos/santos-a-campolide-2026-campolide-9986',
  'https://www.santospopulares.org/?location=campolide',
]

function titleFromUrl(url: string): string {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    const path = u.pathname.replace(/\/$/, '').split('/').pop() ?? ''
    const label = path
      ? path.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      : host
    return `${label} · ${host}`
  } catch {
    return url
  }
}

function sourceFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export async function GET() {
  return NextResponse.json({ ready: true })
}

export async function POST(request: Request) {
  const auth = request.headers.get('authorization') ?? ''
  const secret = process.env.CRON_SECRET ?? ''
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, name, organization_id')
    .ilike('name', '%santos%campolide%')
    .single()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const { data: existing } = await supabase
    .from('event_articles')
    .select('url')
    .eq('event_id', event.id)

  const existingUrls = new Set((existing ?? []).map(a => a.url))
  const toInsert = ALL_URLS.filter(u => !existingUrls.has(u))

  if (toInsert.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, already_existing: existingUrls.size })
  }

  const rows = toInsert.map(url => ({
    event_id: event.id,
    organization_id: event.organization_id,
    url,
    title: titleFromUrl(url),
    source: sourceFromUrl(url),
  }))

  const { error } = await supabase.from('event_articles').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    inserted: toInsert.length,
    already_existing: existingUrls.size,
    new_urls: toInsert,
  })
}
