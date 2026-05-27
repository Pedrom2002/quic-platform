import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Newspaper } from 'lucide-react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { AddArticleDialog } from '@/components/events/cliping/AddArticleDialog'
import { DeleteArticleButton } from '@/components/events/cliping/DeleteArticleButton'

export default async function ClipingPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()

  const [{ data: event }, { data: articles }] = await Promise.all([
    supabase.from('events').select('id, name').eq('id', eventId).single(),
    supabase
      .from('event_articles')
      .select('id, title, url, source, created_at, created_by')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false }),
  ])

  if (!event) notFound()

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/dashboard/events/${eventId}`}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-4 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> {event.name}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cliping</h1>
            <p className="text-slate-500 mt-1">{articles?.length ?? 0} artigo(s) registado(s)</p>
          </div>
          <AddArticleDialog eventId={eventId} />
        </div>
      </div>

      {!articles?.length ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Newspaper className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-400 text-sm">Ainda nao ha artigos. Adiciona o primeiro.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
          {articles.map((a) => (
            <div key={a.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-800 text-sm font-medium hover:text-slate-900 inline-flex items-center gap-1.5"
                >
                  {a.title}
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
                <p className="text-slate-400 text-xs mt-0.5">
                  {a.source ?? 'Sem fonte'} ·{' '}
                  {format(new Date(a.created_at), "d MMM yyyy · HH'h'mm", { locale: pt })}
                </p>
              </div>
              <DeleteArticleButton eventId={eventId} articleId={a.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
