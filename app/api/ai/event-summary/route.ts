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

  const { data: event } = await supabase
    .from('events')
    .select('id, name, start_datetime, status')
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!event) return new Response('Not found', { status: 404 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response('ANTHROPIC_API_KEY not configured', { status: 500 })
  }

  const [{ data: checklistItems }, { data: tasks }, { data: notes }] = await Promise.all([
    supabase
      .from('event_checklist_items')
      .select('title, status, due_at')
      .eq('event_id', eventId),
    supabase
      .from('event_tasks')
      .select('title, status, due_at, assigned_to')
      .eq('event_id', eventId),
    supabase
      .from('event_notes')
      .select('content, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const checklistDone = (checklistItems ?? []).filter(i => i.status === 'completed').length
  const checklistTotal = (checklistItems ?? []).length
  const overdueChecklist = (checklistItems ?? []).filter(i =>
    i.due_at && new Date(i.due_at) < new Date() && i.status !== 'completed' && i.status !== 'skipped'
  ).length

  const tasksDone = (tasks ?? []).filter(t => t.status === 'completed').length
  const tasksTotal = (tasks ?? []).length
  const overdueTasks = (tasks ?? []).filter(t =>
    t.due_at && new Date(t.due_at) < new Date() && t.status !== 'completed' && t.status !== 'skipped'
  ).length

  const context = `Event: ${event.name}
Date: ${event.start_datetime}
Status: ${event.status}

Checklist progress: ${checklistDone}/${checklistTotal} items completed
Overdue checklist items: ${overdueChecklist}

Tasks progress: ${tasksDone}/${tasksTotal} tasks completed
Overdue tasks: ${overdueTasks}

Recent notes (last 10):
${(notes ?? []).map(n => `- ${n.content.slice(0, 200)}`).join('\n') || 'None'}
`

  const prompt = `You are an event management assistant. Based on the following event data, write a concise operational summary in Portuguese (European) in 3-5 paragraphs. Focus on the current state, what's done, what's at risk, and any urgent actions needed.

${context}

Write naturally, as if briefing a team member. No bullet points — prose paragraphs only.`

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
        controller.enqueue(encoder.encode('\n[Erro ao gerar resumo]'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}
