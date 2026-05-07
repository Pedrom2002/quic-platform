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

  const [{ data: task }, { data: orgMembers }, { data: recentTasks }] = await Promise.all([
    supabase
      .from('event_tasks')
      .select('id, title, description')
      .eq('id', taskId)
      .eq('event_id', eventId)
      .single(),
    supabase
      .from('team_members')
      .select('id, full_name, role')
      .eq('organization_id', member.organization_id),
    supabase
      .from('event_tasks')
      .select('title, assigned_to')
      .eq('event_id', eventId)
      .eq('status', 'completed')
      .not('assigned_to', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(20),
  ])

  if (!task) return new Response('Not found', { status: 404 })
  if (!orgMembers || orgMembers.length <= 1) {
    return Response.json(null)
  }

  const memberMap = new Map(orgMembers.map(m => [m.id, m.full_name]))

  const historyLines = (recentTasks ?? [])
    .filter(t => t.assigned_to && memberMap.has(t.assigned_to))
    .map(t => `"${t.title}" -> ${memberMap.get(t.assigned_to!)}`)

  const prompt = `You are an event management assistant. Given a task and team information, suggest the best person to assign.

Task: "${task.title}"
${task.description ? `Description: ${task.description}` : ''}

Team members:
${orgMembers.map(m => `- id: "${m.id}", name: "${m.full_name}", role: "${m.role}"`).join('\n')}

Recent completed task assignments (for context):
${historyLines.length > 0 ? historyLines.join('\n') : 'No history available'}

Return ONLY valid JSON with this exact structure (no markdown):
{ "memberId": "<id from team list above>", "reason": "<one sentence in Portuguese>" }

Or return null if no good match exists. memberId MUST be one of the ids listed above.`

  const anthropic = new Anthropic()
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : 'null'

  let result: { memberId: string; memberName: string; reason: string } | null = null
  try {
    const parsed = JSON.parse(text) as { memberId: string; reason: string } | null
    if (parsed && orgMembers.some(m => m.id === parsed.memberId)) {
      result = {
        memberId: parsed.memberId,
        memberName: memberMap.get(parsed.memberId) ?? 'Unknown',
        reason: parsed.reason,
      }
    }
  } catch {
    result = null
  }

  return Response.json(result)
}
