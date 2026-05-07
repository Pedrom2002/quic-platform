import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import FilesManager from '@/components/events/FilesManager'
import type { EventFileWithUploader } from '@/types/app'

export default async function EventFilesPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: event } = await supabase
    .from('events')
    .select('id, name')
    .eq('id', eventId)
    .single()
  if (!event) notFound()

  const { data: files } = await supabase
    .from('event_files')
    .select('*, uploader:team_members!uploaded_by(id, full_name, avatar_url)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .returns<EventFileWithUploader[]>()

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href={`/dashboard/events/${eventId}`} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-6 transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" /> {event.name}
      </Link>
      <h1 className="text-xl font-bold text-slate-900 mb-6">Ficheiros</h1>
      <FilesManager eventId={eventId} initialFiles={files ?? []} />
    </div>
  )
}
