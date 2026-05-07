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

  const body = await req.json() as {
    eventId: string
    eventType: string
    guestCount: number
    eventDate: string
    notes?: string
  }

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', body.eventId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!event) return new Response('Not found', { status: 404 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response('ANTHROPIC_API_KEY not configured', { status: 500 })
  }

  const client = new Anthropic()

  const prompt = `Generate a task list for an event with the following details:
- Event type: ${body.eventType}
- Number of guests: ${body.guestCount}
- Event date: ${body.eventDate}
- Additional notes: ${body.notes ?? 'None'}

Return ONLY a valid JSON array with this structure (no markdown, no explanation):
[
  { "title": "Root task title", "subtasks": [{ "title": "Sub-task title" }, ...] },
  ...
]

Rules:
- Maximum 50 root tasks
- Maximum 10 subtasks per root task
- Titles in Portuguese (European)
- Be specific and actionable
- Cover logistics, coordination, technical, and people aspects`

  const stream = await client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
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
        controller.enqueue(encoder.encode('\n{"error":true}'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}
