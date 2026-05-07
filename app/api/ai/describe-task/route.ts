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

  const { taskId, eventId } = await req.json() as { taskId: string; eventId: string }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response('ANTHROPIC_API_KEY not configured', { status: 500 })
  }

  const { data: task } = await supabase
    .from('event_tasks')
    .select('id, title, description, parent_id, event_id')
    .eq('id', taskId)
    .eq('event_id', eventId)
    .single()

  if (!task) return new Response('Not found', { status: 404 })

  const { data: event } = await supabase
    .from('events')
    .select('name')
    .eq('id', task.event_id)
    .eq('organization_id', member.organization_id)
    .single()
  if (!event) return new Response('Forbidden', { status: 403 })

  let parentTitle: string | null = null
  if (task.parent_id) {
    const { data: parent } = await supabase
      .from('event_tasks')
      .select('title')
      .eq('id', task.parent_id)
      .single()
    parentTitle = parent?.title ?? null
  }

  const prompt = `You are an event management assistant. Write a clear, actionable description for the following task, then suggest 3-5 sub-tasks.

Event: "${event.name}"
${parentTitle ? `Parent task: "${parentTitle}"` : ''}
Task: "${task.title}"

Instructions:
1. First, write a 2-4 sentence description in Portuguese (European) explaining what this task involves, who might do it, and what success looks like.
2. Then write exactly this separator on its own line: ---SUBTASKS---
3. After the separator, return ONLY a JSON array of sub-task title strings, e.g.: ["Sub-task 1", "Sub-task 2", "Sub-task 3"]

Example output format:
Esta tarefa envolve coordenar todos os aspectos logísticos do evento. O responsável deverá...

---SUBTASKS---
["Confirmar disponibilidade do local", "Preparar lista de materiais", "Contactar fornecedores"]

No markdown code blocks. The JSON must be on a single line after the separator.`

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
        controller.enqueue(encoder.encode('\n---SUBTASKS---\n[]'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}
