import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { TaskTree } from '@/components/events/TaskTree'
import { loadEventTasksAction, loadChecklistItemsForLinkingAction } from './actions'

export default async function TasksPage({
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

  const { data: currentMember } = await supabase
    .from('team_members')
    .select('id, organization_id')
    .eq('auth_user_id', user.id)
    .single()

  const [tasks, checklistItems, orgMembersResult] = await Promise.all([
    loadEventTasksAction(eventId),
    loadChecklistItemsForLinkingAction(eventId),
    currentMember
      ? supabase
          .from('team_members')
          .select('id, full_name')
          .eq('organization_id', currentMember.organization_id)
          .order('full_name', { ascending: true })
      : Promise.resolve({ data: [] }),
  ])

  const orgMembers = (orgMembersResult.data ?? []) as { id: string; full_name: string }[]

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/dashboard/events/${eventId}`}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-4 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> {event.name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Tarefas internas</h1>
        <p className="text-slate-500 mt-1">Gestão de trabalho interno da equipa. Não visível ao cliente.</p>
      </div>

      <TaskTree
        eventId={eventId}
        initialTasks={tasks}
        orgMembers={orgMembers}
        currentMemberId={currentMember?.id ?? null}
        checklistItems={checklistItems}
      />
    </div>
  )
}
