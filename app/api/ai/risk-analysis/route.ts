import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: member } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!member) return new Response('Forbidden', { status: 403 })

  const { eventId } = await req.json() as { eventId: string }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response('ANTHROPIC_API_KEY not configured', { status: 500 })
  }

  const { data: event } = await supabase
    .from('events')
    .select('id, name, start_datetime, status')
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!event) return new Response('Not found', { status: 404 })

  const [{ data: tasks }, { data: checklistItems }, { count: teamCount }, { count: noteCount }] = await Promise.all([
    supabase.from('event_tasks').select('status, due_at, assigned_to').eq('event_id', eventId),
    supabase.from('event_checklist_items').select('status, due_at').eq('event_id', eventId),
    supabase.from('event_team_assignments').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase.from('event_notes').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
  ])

  const now = new Date()
  const eventDate = new Date(event.start_datetime)
  const daysUntilEvent = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const overdueTasks = (tasks ?? []).filter(t =>
    t.due_at && new Date(t.due_at) < now && t.status !== 'completed' && t.status !== 'skipped'
  ).length
  const completedTasks = (tasks ?? []).filter(t => t.status === 'completed').length
  const totalTasks = (tasks ?? []).length
  const unassignedTasks = (tasks ?? []).filter(t => !t.assigned_to && t.status !== 'completed' && t.status !== 'skipped').length

  const overdueChecklist = (checklistItems ?? []).filter(i =>
    i.due_at && new Date(i.due_at) < now && i.status !== 'completed' && i.status !== 'skipped'
  ).length
  const completedChecklist = (checklistItems ?? []).filter(i => i.status === 'completed').length
  const totalChecklist = (checklistItems ?? []).length

  const stats = `Event: ${event.name}
Status: ${event.status}
Days until event: ${daysUntilEvent}

Tasks: ${completedTasks}/${totalTasks} completed, ${overdueTasks} overdue, ${unassignedTasks} unassigned
Checklist: ${completedChecklist}/${totalChecklist} completed, ${overdueChecklist} overdue
Team assignments: ${teamCount ?? 0}
Notes: ${noteCount ?? 0}`

  const prompt = `You are an event risk analyst. Analyse the following event data and assess the risk level.

${stats}

Your response MUST start with exactly one of these lines:
LEVEL: green
LEVEL: yellow
LEVEL: red

Then a blank line, then a risk analysis in Portuguese (European) with two sections:
**Fatores de risco:** (bullet list of identified risks)
**Recomendações:** (bullet list of recommended actions)

Be concise and specific. 3-6 bullets per section.`

  const anthropic = new Anthropic()
  const stream = await anthropic.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } catch {
        controller.enqueue(encoder.encode('\nLEVEL: yellow\n\nErro ao gerar análise.'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}
