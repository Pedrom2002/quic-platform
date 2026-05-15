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

  // Wave 1: auth + event in parallel
  const [{ data: { user } }, { data: event }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('events').select('id, name').eq('id', eventId).single(),
  ])

  if (!user) redirect('/auth/login')
  if (!event) notFound()

  // Wave 2: team member + task data in parallel
  const [{ data: currentMember }, tasks, checklistItems] = await Promise.all([
    supabase.from('team_members').select('id, organization_id').eq('auth_user_id', user.id).single(),
    loadEventTasksAction(eventId),
    loadChecklistItemsForLinkingAction(eventId),
  ])

  // Wave 3: org members (needs currentMember.organization_id)
  const orgMembersResult = currentMember
    ? await supabase
        .from('team_members')
        .select('id, full_name')
        .eq('organization_id', currentMember.organization_id)
        .order('full_name', { ascending: true })
    : { data: [] }

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
