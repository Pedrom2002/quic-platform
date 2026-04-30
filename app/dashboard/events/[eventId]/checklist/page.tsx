import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ChecklistBoard } from '@/components/events/ChecklistBoard'

export default async function ChecklistPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, name, status')
    .eq('id', eventId)
    .single()

  if (!event) notFound()

  const { data: items } = await supabase
    .from('event_checklist_items')
    .select('*, assigned_member:team_members!assigned_to(id, full_name, avatar_url)')
    .eq('event_id', eventId)
    .order('position', { ascending: true })

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href={`/dashboard/events/${eventId}`} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-4 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> {event.name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Checklist de Preparação</h1>
        <p className="text-slate-500 mt-1">Marque as etapas como concluídas para notificar automaticamente os clientes.</p>
      </div>

      <ChecklistBoard eventId={eventId} initialItems={items ?? []} />
    </div>
  )
}
