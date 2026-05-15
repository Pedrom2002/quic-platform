import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ChecklistBoard } from '@/components/events/ChecklistBoard'
import type { ItemWithMemberAndCounts } from '@/types/app'

export default async function ChecklistPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()

  // Wave 1: auth + event in parallel
  const [{ data: { user } }, { data: event }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('events').select('id, name, status').eq('id', eventId).single(),
  ])

  if (!user) redirect('/auth/login')
  if (!event) notFound()

  // Wave 2: checklist items + current member in parallel
  const [{ data: items }, { data: currentMember }] = await Promise.all([
    supabase
      .from('event_checklist_items')
      .select('*, assigned_member:team_members!assigned_to(id, full_name, avatar_url)')
      .eq('event_id', eventId)
      .order('position', { ascending: true }),
    supabase.from('team_members').select('id').eq('auth_user_id', user.id).single(),
  ])

  // Count notes and files per item
  const itemIds = (items ?? []).map(i => i.id)

  const [{ data: noteCounts }, { data: fileCounts }] = await Promise.all([
    itemIds.length
      ? supabase
          .from('checklist_item_notes')
          .select('checklist_item_id')
          .in('checklist_item_id', itemIds)
      : Promise.resolve({ data: [] }),
    itemIds.length
      ? supabase
          .from('checklist_item_files')
          .select('checklist_item_id')
          .in('checklist_item_id', itemIds)
      : Promise.resolve({ data: [] }),
  ])

  const noteCountMap = new Map<string, number>()
  for (const r of noteCounts ?? []) {
    noteCountMap.set(r.checklist_item_id, (noteCountMap.get(r.checklist_item_id) ?? 0) + 1)
  }
  const fileCountMap = new Map<string, number>()
  for (const r of fileCounts ?? []) {
    fileCountMap.set(r.checklist_item_id, (fileCountMap.get(r.checklist_item_id) ?? 0) + 1)
  }

  const itemsWithCounts: ItemWithMemberAndCounts[] = (items ?? []).map(item => ({
    ...item,
    note_count: noteCountMap.get(item.id) ?? 0,
    file_count: fileCountMap.get(item.id) ?? 0,
  }))

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href={`/dashboard/events/${eventId}`} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-4 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> {event.name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Checklist de Preparação</h1>
        <p className="text-slate-500 mt-1">Marque as etapas como concluídas para notificar automaticamente os clientes.</p>
      </div>

      <ChecklistBoard
        eventId={eventId}
        initialItems={itemsWithCounts}
        currentMemberId={currentMember?.id ?? null}
      />
    </div>
  )
}
