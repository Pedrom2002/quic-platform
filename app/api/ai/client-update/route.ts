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

  const { eventId, focus } = await req.json() as { eventId: string; focus: string }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response('ANTHROPIC_API_KEY not configured', { status: 500 })
  }

  const { data: event } = await supabase
    .from('events')
    .select('id, name, start_datetime, status, venue_name')
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!event) return new Response('Not found', { status: 404 })

  const { data: checklistItems } = await supabase
    .from('event_checklist_items')
    .select('status, due_at')
    .eq('event_id', eventId)

  const now = new Date()
  const total = (checklistItems ?? []).length
  const completed = (checklistItems ?? []).filter(i => i.status === 'completed').length
  const overdue = (checklistItems ?? []).filter(i =>
    i.due_at && new Date(i.due_at) < now && i.status !== 'completed' && i.status !== 'skipped'
  ).length

  const eventDate = new Date(event.start_datetime)
  const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const context = `Event name: ${event.name}
Date: ${event.start_datetime}${daysUntil > 0 ? ` (${daysUntil} days away)` : ' (past)'}
Status: ${event.status}
Venue: ${event.venue_name ?? 'Not specified'}
Checklist: ${completed}/${total} items completed${overdue > 0 ? `, ${overdue} overdue` : ''}`

  const focusInstructions: Record<string, string> = {
    'Update geral de progresso': 'Write a general progress update. Mention how preparation is going, the completion rate, and what is still being prepared.',
    'Confirmação de detalhes do evento': 'Write a message confirming event details (date, venue, status). Reassure the client everything is on track.',
    'Aviso de prazo / item pendente': 'Write a message alerting the client that some items still need attention or confirmation. Be polite but clear about urgency.',
    'Mensagem de boas-vindas': 'Write a warm welcome message introducing the team and confirming the event is being actively prepared.',
  }

  const focusInstruction = focusInstructions[focus] ?? focusInstructions['Update geral de progresso']

  const prompt = `You are a professional event coordinator writing to a client in Portuguese (European).

Event context:
${context}

Task: ${focusInstruction}

Rules:
- Write 2-3 paragraphs of flowing prose (no bullet points, no headers)
- Address the client directly using "o seu evento" or "o vosso evento"
- Professional but warm tone
- Do NOT invent any details not present in the context above
- Do NOT include subject lines, greetings like "Caro cliente", or sign-offs
- Write only the body text of the email message`

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
        controller.enqueue(encoder.encode('\n[Erro ao gerar mensagem]'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}
