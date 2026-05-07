# AI Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 AI-powered on-demand features to the internal dashboard using Anthropic Haiku (`claude-haiku-4-5-20251001`).

**Architecture:** All AI routes live under `app/api/ai/`, each verifying Supabase session + org membership before calling Anthropic. Streaming responses use `ReadableStream` with `text/event-stream`. New modal components handle each feature's UI.

**Tech Stack:** `@anthropic-ai/sdk`, Next.js Route Handlers, Supabase Auth, React useState/useEffect, `ReadableStream`

---

## File Map

| Action | File |
|---|---|
| Create | `app/api/ai/generate-tasks/route.ts` |
| Create | `app/api/ai/event-summary/route.ts` |
| Create | `app/api/ai/suggest-assignee/route.ts` |
| Create | `app/api/ai/describe-task/route.ts` |
| Create | `app/api/ai/risk-analysis/route.ts` |
| Create | `components/events/GenerateTasksModal.tsx` |
| Create | `components/events/EventSummaryModal.tsx` |
| Create | `components/events/RiskAnalysisModal.tsx` |
| Modify | `components/events/TaskTree.tsx` |
| Modify | `components/events/TaskSidePanel.tsx` |
| Modify | `app/dashboard/events/[eventId]/page.tsx` |

---

## Task 1: Install @anthropic-ai/sdk

**Files:**
- Modify: `package.json`
- Modify: `.env.local` (add placeholder, already in .gitignore)

- [ ] **Step 1: Install package**

```bash
npm install @anthropic-ai/sdk
```

Expected: `added 1 package` (or similar)

- [ ] **Step 2: Add env variable placeholder to .env.local**

Add this line to `.env.local`:
```
ANTHROPIC_API_KEY=your-key-here
```

The actual key must be set before testing AI routes.

- [ ] **Step 3: Verify TypeScript can find types**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: same errors as before (no new anthropic-related errors)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @anthropic-ai/sdk"
```

---

## Task 2: Feature 1 — Generate Tasks Route Handler

**Files:**
- Create: `app/api/ai/generate-tasks/route.ts`

- [ ] **Step 1: Create route file**

```typescript
// app/api/ai/generate-tasks/route.ts
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
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "generate-tasks"
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/ai/generate-tasks/route.ts
git commit -m "feat: POST /api/ai/generate-tasks route handler"
```

---

## Task 3: Feature 2 — Event Summary Route Handler

**Files:**
- Create: `app/api/ai/event-summary/route.ts`

- [ ] **Step 1: Create route file**

```typescript
// app/api/ai/event-summary/route.ts
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
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "event-summary"
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/ai/event-summary/route.ts
git commit -m "feat: POST /api/ai/event-summary route handler"
```

---

## Task 4: Feature 3 — Suggest Assignee Route Handler

**Files:**
- Create: `app/api/ai/suggest-assignee/route.ts`

- [ ] **Step 1: Create route file**

```typescript
// app/api/ai/suggest-assignee/route.ts
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

  let result: { memberId: string; reason: string } | null = null
  try {
    const parsed = JSON.parse(text) as { memberId: string; reason: string } | null
    if (parsed && orgMembers.some(m => m.id === parsed.memberId)) {
      const memberName = memberMap.get(parsed.memberId) ?? 'Unknown'
      result = { memberId: parsed.memberId, memberName, reason: parsed.reason } as typeof result & { memberName: string }
    }
  } catch {
    result = null
  }

  return Response.json(result)
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "suggest-assignee"
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/ai/suggest-assignee/route.ts
git commit -m "feat: POST /api/ai/suggest-assignee route handler"
```

---

## Task 5: Feature 4 — Describe Task Route Handler

**Files:**
- Create: `app/api/ai/describe-task/route.ts`

- [ ] **Step 1: Create route file**

```typescript
// app/api/ai/describe-task/route.ts
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
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "describe-task"
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/ai/describe-task/route.ts
git commit -m "feat: POST /api/ai/describe-task route handler"
```

---

## Task 6: Feature 5 — Risk Analysis Route Handler

**Files:**
- Create: `app/api/ai/risk-analysis/route.ts`

- [ ] **Step 1: Create route file**

```typescript
// app/api/ai/risk-analysis/route.ts
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
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "risk-analysis"
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/ai/risk-analysis/route.ts
git commit -m "feat: POST /api/ai/risk-analysis route handler"
```

---

## Task 7: Feature 1 Modal — GenerateTasksModal

**Files:**
- Create: `components/events/GenerateTasksModal.tsx`

- [ ] **Step 1: Create modal component**

```typescript
// components/events/GenerateTasksModal.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Sparkles, Loader2, ChevronRight } from 'lucide-react'
import { createTaskAction } from '@/app/dashboard/events/[eventId]/tasks/actions'
import type { EventTask } from '@/types/app'

interface GeneratedTask {
  title: string
  subtasks: { title: string }[]
}

interface Props {
  eventId: string
  onClose: () => void
  onTasksCreated: (tasks: EventTask[]) => void
}

const EVENT_TYPES = [
  'Festival de Música',
  'Conferência',
  'Casamento',
  'Evento Corporativo',
  'Concerto',
  'Desfile',
  'Outro',
]

export default function GenerateTasksModal({ eventId, onClose, onTasksCreated }: Props) {
  const [phase, setPhase] = useState<'form' | 'preview'>('form')
  const [eventType, setEventType] = useState('')
  const [customType, setCustomType] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [notes, setNotes] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamedText, setStreamedText] = useState('')
  const [parsedTasks, setParsedTasks] = useState<GeneratedTask[]>([])
  const [inserting, setInserting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleGenerate() {
    const type = eventType === 'Outro' ? customType : eventType
    if (!type || !guestCount || !eventDate) return
    setPhase('preview')
    setStreaming(true)
    setStreamedText('')
    setParsedTasks([])
    setError(null)

    try {
      const res = await fetch('/api/ai/generate-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          eventType: type,
          guestCount: Number(guestCount),
          eventDate,
          notes,
        }),
      })

      if (!res.ok || !res.body) {
        setError('Erro ao gerar. Tenta novamente.')
        setStreaming(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setStreamedText(accumulated)
      }

      try {
        const jsonStart = accumulated.indexOf('[')
        const jsonEnd = accumulated.lastIndexOf(']')
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const parsed = JSON.parse(accumulated.slice(jsonStart, jsonEnd + 1)) as GeneratedTask[]
          setParsedTasks(parsed)
        } else {
          setError('Resposta inválida. Tenta novamente.')
        }
      } catch {
        setError('Erro ao processar resposta. Tenta novamente.')
      }
    } catch {
      setError('Erro de ligação. Tenta novamente.')
    } finally {
      setStreaming(false)
    }
  }

  async function handleInsert() {
    if (!parsedTasks.length || inserting) return
    setInserting(true)
    const created: EventTask[] = []
    for (const root of parsedTasks) {
      const rootTask = await createTaskAction(eventId, { title: root.title })
      if (rootTask) {
        created.push(rootTask)
        for (const sub of root.subtasks ?? []) {
          const subTask = await createTaskAction(eventId, { title: sub.title, parentId: rootTask.id })
          if (subTask) created.push(subTask)
        }
      }
    }
    onTasksCreated(created)
    onClose()
  }

  const totalCount = parsedTasks.reduce((acc, t) => acc + 1 + (t.subtasks?.length ?? 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-semibold text-slate-800">Gerar tarefas com IA</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {phase === 'form' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de evento</label>
                <select
                  value={eventType}
                  onChange={e => setEventType(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                >
                  <option value="">Selecionar...</option>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {eventType === 'Outro' && (
                  <input
                    type="text"
                    value={customType}
                    onChange={e => setCustomType(e.target.value)}
                    placeholder="Descreve o tipo de evento..."
                    className="mt-2 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Número de pessoas</label>
                <input
                  type="number"
                  value={guestCount}
                  onChange={e => setGuestCount(e.target.value)}
                  min={1}
                  placeholder="ex: 200"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Data do evento</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={e => setEventDate(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Notas adicionais <span className="text-slate-400">(opcional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Requisitos especiais, tema, localização..."
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none"
                />
              </div>
            </div>
          )}

          {phase === 'preview' && (
            <div>
              {streaming && parsedTasks.length === 0 && (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  A gerar tarefas...
                </div>
              )}
              {error && (
                <p className="text-sm text-red-500 py-4">{error}</p>
              )}
              {parsedTasks.length > 0 && (
                <div className="space-y-2">
                  {parsedTasks.map((task, i) => (
                    <div key={i} className="border border-slate-100 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-slate-50 text-sm font-medium text-slate-800">{task.title}</div>
                      {task.subtasks?.map((sub, j) => (
                        <div key={j} className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 border-t border-slate-50">
                          <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                          {sub.title}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancelar
          </button>
          {phase === 'form' ? (
            <button
              onClick={handleGenerate}
              disabled={!eventType || (eventType === 'Outro' && !customType) || !guestCount || !eventDate}
              className="text-sm font-medium px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Gerar
            </button>
          ) : (
            <button
              onClick={handleInsert}
              disabled={streaming || parsedTasks.length === 0 || inserting}
              className="text-sm font-medium px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {inserting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Inserir {totalCount > 0 ? `${totalCount} tarefas` : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "GenerateTasksModal"
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/events/GenerateTasksModal.tsx
git commit -m "feat: GenerateTasksModal component"
```

---

## Task 8: Feature 2+5 Modals — EventSummaryModal and RiskAnalysisModal

**Files:**
- Create: `components/events/EventSummaryModal.tsx`
- Create: `components/events/RiskAnalysisModal.tsx`

- [ ] **Step 1: Create EventSummaryModal**

```typescript
// components/events/EventSummaryModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, Loader2 } from 'lucide-react'

interface Props {
  eventId: string
  onClose: () => void
}

export default function EventSummaryModal({ eventId, onClose }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch('/api/ai/event-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId }),
        })
        if (!res.ok || !res.body) {
          setError('Erro ao gerar. Tenta novamente.')
          return
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          setText(prev => prev + decoder.decode(value, { stream: true }))
        }
      } catch {
        setError('Erro de ligação. Tenta novamente.')
      } finally {
        setLoading(false)
      }
    }
    fetchSummary()
  }, [eventId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <h2 className="text-sm font-semibold text-slate-800">Resumo do evento</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && !text && (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              A gerar resumo...
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {text && (
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{text}</p>
          )}
        </div>
        <div className="flex justify-end px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="text-sm font-medium px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create RiskAnalysisModal**

```typescript
// components/events/RiskAnalysisModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { X, ShieldAlert, Loader2 } from 'lucide-react'

type RiskLevel = 'green' | 'yellow' | 'red'

const LEVEL_BADGE: Record<RiskLevel, { label: string; class: string }> = {
  green: { label: 'Baixo Risco', class: 'bg-green-100 text-green-700' },
  yellow: { label: 'Risco Moderado', class: 'bg-amber-100 text-amber-700' },
  red: { label: 'Alto Risco', class: 'bg-red-100 text-red-700' },
}

interface Props {
  eventId: string
  onClose: () => void
}

export default function RiskAnalysisModal({ eventId, onClose }: Props) {
  const [level, setLevel] = useState<RiskLevel | null>(null)
  const [prose, setProse] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        const res = await fetch('/api/ai/risk-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId }),
        })
        if (!res.ok || !res.body) {
          setError('Erro ao gerar. Tenta novamente.')
          return
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''
        let levelParsed = false

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          accumulated += decoder.decode(value, { stream: true })

          if (!levelParsed) {
            const lines = accumulated.split('\n')
            const levelLine = lines.find(l => l.startsWith('LEVEL:'))
            if (levelLine) {
              const parsed = levelLine.replace('LEVEL:', '').trim() as RiskLevel
              if (['green', 'yellow', 'red'].includes(parsed)) {
                setLevel(parsed)
                levelParsed = true
                // rest of text after first blank line
                const afterLevel = accumulated.slice(accumulated.indexOf('\n\n') + 2)
                setProse(afterLevel)
              }
            }
          } else {
            const afterLevel = accumulated.slice(accumulated.indexOf('\n\n') + 2)
            setProse(afterLevel)
          }
        }
      } catch {
        setError('Erro de ligação. Tenta novamente.')
      } finally {
        setLoading(false)
      }
    }
    fetchAnalysis()
  }, [eventId])

  const badge = level ? LEVEL_BADGE[level] : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-slate-800">Análise de risco</h2>
            {badge && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.class}`}>
                {badge.label}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && !prose && !error && (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              A analisar...
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {prose && (
            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{prose}</div>
          )}
        </div>
        <div className="flex justify-end px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="text-sm font-medium px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -E "(EventSummaryModal|RiskAnalysisModal)"
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add components/events/EventSummaryModal.tsx components/events/RiskAnalysisModal.tsx
git commit -m "feat: EventSummaryModal and RiskAnalysisModal components"
```

---

## Task 9: Modify TaskTree — "Gerar com IA" button + GenerateTasksModal

**Files:**
- Modify: `components/events/TaskTree.tsx`

The spec says: button "Gerar com IA" in the header of TaskTree (tree view only), opens GenerateTasksModal.

Current header (line ~198-229) has: search, view toggle, "Nova tarefa" button.

- [ ] **Step 1: Add import and state**

At the top of `components/events/TaskTree.tsx`, add import after existing imports:

```typescript
import { Sparkles } from 'lucide-react'
import GenerateTasksModal from './GenerateTasksModal'
```

In the `TaskTree` function body, add state after existing state declarations:

```typescript
const [showGenerateModal, setShowGenerateModal] = useState(false)
```

- [ ] **Step 2: Add button in header (tree view section)**

In the `ml-auto flex items-center gap-2` div (currently contains view toggle and "Nova tarefa" button), add the "Gerar com IA" button immediately before the "Nova tarefa" button, visible only when `view === 'tree'`:

```tsx
{view === 'tree' && (
  <button
    onClick={() => setShowGenerateModal(true)}
    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
    title="Gerar tarefas com IA"
  >
    <Sparkles className="w-3.5 h-3.5" /> Gerar com IA
  </button>
)}
```

- [ ] **Step 3: Render modal at end of component JSX**

Inside the outer `<div className="flex gap-6">` return, after the side panel block, add:

```tsx
{showGenerateModal && (
  <GenerateTasksModal
    eventId={eventId}
    onClose={() => setShowGenerateModal(false)}
    onTasksCreated={(newTasks) => {
      newTasks.forEach(handleTaskCreated)
      setShowGenerateModal(false)
    }}
  />
)}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "TaskTree"
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add components/events/TaskTree.tsx
git commit -m "feat: add Gerar com IA button and GenerateTasksModal to TaskTree"
```

---

## Task 10: Modify TaskSidePanel — Assignee suggestion chip + Auto-description button

**Files:**
- Modify: `components/events/TaskSidePanel.tsx`

The spec says:
- Feature 3: chip "✨ Sugerir responsável" below assignee dropdown, shown when `assigned_to === null` and org has >1 member
- Feature 4: button "✨ Gerar descrição" below description textarea (always visible)

- [ ] **Step 1: Read current assignee dropdown and description sections**

Read `components/events/TaskSidePanel.tsx` lines 130-350 to find assignee dropdown and description textarea sections. Identify exact JSX to modify.

- [ ] **Step 2: Add state for both features**

Add after the existing `[addingSubTask, setAddingSubTask]` state:

```typescript
const [suggestionState, setSuggestionState] = useState<
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'suggested'; memberId: string; memberName: string; reason: string }
>({ status: 'idle' })

const [describeState, setDescribeState] = useState<
  | { status: 'idle' }
  | { status: 'streaming' }
  | { status: 'done'; subtasks: string[] }
>({ status: 'idle' })
const [selectedSubtasks, setSelectedSubtasks] = useState<Set<number>>(new Set())
```

Reset both states when task changes by adding to the `useEffect` that depends on `task.id`:

```typescript
setSuggestionState({ status: 'idle' })
setDescribeState({ status: 'idle' })
setSelectedSubtasks(new Set())
```

- [ ] **Step 3: Add suggestion chip below assignee `<select>`**

Find the assignee dropdown section. After the closing `</select>` tag (or after the assignee div), add:

```tsx
{assignedTo === '' && orgMembers.length > 1 && (
  <div className="mt-1.5">
    {suggestionState.status === 'idle' && (
      <button
        onClick={async () => {
          setSuggestionState({ status: 'loading' })
          try {
            const res = await fetch('/api/ai/suggest-assignee', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ taskId: task.id, eventId }),
            })
            const data = await res.json() as { memberId: string; memberName: string; reason: string } | null
            if (data) {
              setSuggestionState({ status: 'suggested', ...data })
            } else {
              setSuggestionState({ status: 'idle' })
            }
          } catch {
            setSuggestionState({ status: 'idle' })
          }
        }}
        className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
      >
        ✨ Sugerir responsável
      </button>
    )}
    {suggestionState.status === 'loading' && (
      <span className="text-xs text-slate-400 flex items-center gap-1">
        <Loader2 className="w-3 h-3 animate-spin" /> A sugerir...
      </span>
    )}
    {suggestionState.status === 'suggested' && (
      <div className="text-xs">
        <span className="text-slate-600 font-medium">{suggestionState.memberName}</span>
        <span className="text-slate-400"> — {suggestionState.reason}</span>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => {
              setAssignedTo(suggestionState.memberId)
              saveField({ assigned_to: suggestionState.memberId })
              setSuggestionState({ status: 'idle' })
            }}
            className="text-xs font-medium text-green-600 hover:text-green-700"
          >
            Aceitar
          </button>
          <button
            onClick={() => setSuggestionState({ status: 'idle' })}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Dispensar
          </button>
        </div>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 4: Add "Gerar descrição" button below description textarea**

Find the description `<textarea>` section. After the closing `</textarea>` tag, add:

```tsx
<div className="mt-1.5">
  <button
    onClick={async () => {
      setDescribeState({ status: 'streaming' })
      setDescription('')
      try {
        const res = await fetch('/api/ai/describe-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: task.id, eventId }),
        })
        if (!res.ok || !res.body) {
          setDescribeState({ status: 'idle' })
          return
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''
        const SENTINEL = '---SUBTASKS---'

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          accumulated += decoder.decode(value, { stream: true })

          const sentinelIdx = accumulated.indexOf(SENTINEL)
          if (sentinelIdx === -1) {
            setDescription(accumulated)
          } else {
            setDescription(accumulated.slice(0, sentinelIdx).trimEnd())
          }
        }

        const sentinelIdx = accumulated.indexOf(SENTINEL)
        if (sentinelIdx !== -1) {
          const descPart = accumulated.slice(0, sentinelIdx).trimEnd()
          const subtasksPart = accumulated.slice(sentinelIdx + SENTINEL.length).trim()
          saveField({ description: descPart })
          try {
            const subtasks = JSON.parse(subtasksPart) as string[]
            setSelectedSubtasks(new Set(subtasks.map((_, i) => i)))
            setDescribeState({ status: 'done', subtasks })
          } catch {
            setDescribeState({ status: 'done', subtasks: [] })
          }
        } else {
          saveField({ description: accumulated })
          setDescribeState({ status: 'idle' })
        }
      } catch {
        setDescribeState({ status: 'idle' })
      }
    }}
    disabled={describeState.status === 'streaming'}
    className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1"
  >
    {describeState.status === 'streaming'
      ? <><Loader2 className="w-3 h-3 animate-spin" /> A gerar...</>
      : <>✨ {description ? 'Regenerar descrição' : 'Gerar descrição'}</>
    }
  </button>
</div>

{describeState.status === 'done' && describeState.subtasks.length > 0 && (
  <div className="mt-3 border border-indigo-100 rounded-lg p-3 bg-indigo-50/50">
    <p className="text-xs font-medium text-indigo-700 mb-2">Sub-tarefas sugeridas</p>
    <div className="space-y-1.5">
      {describeState.subtasks.map((sub, i) => (
        <label key={i} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedSubtasks.has(i)}
            onChange={() => {
              setSelectedSubtasks(prev => {
                const next = new Set(prev)
                next.has(i) ? next.delete(i) : next.add(i)
                return next
              })
            }}
            className="w-3.5 h-3.5 rounded text-indigo-600"
          />
          <span className="text-xs text-slate-700">{sub}</span>
        </label>
      ))}
    </div>
    <button
      onClick={async () => {
        const toCreate = describeState.subtasks.filter((_, i) => selectedSubtasks.has(i))
        for (const title of toCreate) {
          const created = await createTaskAction(eventId, { title, parentId: task.id })
          if (created) onCreated(created)
        }
        setDescribeState({ status: 'idle' })
      }}
      disabled={selectedSubtasks.size === 0}
      className="mt-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      Criar sub-tarefas selecionadas
    </button>
  </div>
)}
```

- [ ] **Step 5: Add Loader2 to imports if not already present**

Check line 6 of `TaskSidePanel.tsx` — `Loader2` should already be in the Lucide import. If not, add it.

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "TaskSidePanel"
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add components/events/TaskSidePanel.tsx
git commit -m "feat: assignee suggestion chip and auto-description button in TaskSidePanel"
```

---

## Task 11: Modify Event Detail Page — Resumo IA + Analisar Risco buttons

**Files:**
- Modify: `app/dashboard/events/[eventId]/page.tsx`

The spec says: button "Resumo IA" and button "Analisar Risco" on the event detail page, near the quick-link cards. They open their respective modals.

This page is a Server Component. The buttons need client-side state, so wrap them in a small `'use client'` component, or add them inline after converting the buttons to a Client Component that receives `eventId`.

**Approach:** Create a small `AIButtons` client component that receives `eventId` and renders both buttons + their modals.

- [ ] **Step 1: Create AIButtons client component**

```typescript
// components/events/AIButtons.tsx
'use client'

import { useState } from 'react'
import { Sparkles, ShieldAlert } from 'lucide-react'
import dynamic from 'next/dynamic'

const EventSummaryModal = dynamic(() => import('./EventSummaryModal'))
const RiskAnalysisModal = dynamic(() => import('./RiskAnalysisModal'))

interface Props {
  eventId: string
}

export default function AIButtons({ eventId }: Props) {
  const [showSummary, setShowSummary] = useState(false)
  const [showRisk, setShowRisk] = useState(false)

  return (
    <>
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={() => setShowSummary(true)}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 border border-violet-200 text-violet-600 rounded-lg hover:bg-violet-50 transition-colors"
        >
          <Sparkles className="w-4 h-4" /> Resumo IA
        </button>
        <button
          onClick={() => setShowRisk(true)}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
        >
          <ShieldAlert className="w-4 h-4" /> Analisar Risco
        </button>
      </div>

      {showSummary && (
        <EventSummaryModal eventId={eventId} onClose={() => setShowSummary(false)} />
      )}
      {showRisk && (
        <RiskAnalysisModal eventId={eventId} onClose={() => setShowRisk(false)} />
      )}
    </>
  )
}
```

- [ ] **Step 2: Import and render AIButtons in the event detail page**

In `app/dashboard/events/[eventId]/page.tsx`, add import:

```typescript
import AIButtons from '@/components/events/AIButtons'
```

After the closing `</div>` of the `grid grid-cols-6 gap-4` quick-link cards section (around line 283), render the component:

```tsx
<AIButtons eventId={eventId} />
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors

- [ ] **Step 4: Commit**

```bash
git add components/events/AIButtons.tsx app/dashboard/events/[eventId]/page.tsx
git commit -m "feat: Resumo IA and Analisar Risco buttons on event detail page"
```

---

## Spec Coverage Checklist

- [x] Feature 1: POST /api/ai/generate-tasks (Task 2) + GenerateTasksModal (Task 7) + TaskTree button (Task 9)
- [x] Feature 2: POST /api/ai/event-summary (Task 3) + EventSummaryModal (Task 8) + event page button (Task 11)
- [x] Feature 3: POST /api/ai/suggest-assignee (Task 4) + chip in TaskSidePanel (Task 10)
- [x] Feature 4: POST /api/ai/describe-task (Task 5) + button in TaskSidePanel (Task 10)
- [x] Feature 5: POST /api/ai/risk-analysis (Task 6) + RiskAnalysisModal (Task 8) + event page button (Task 11)
- [x] All routes: auth check (session + org member + event ownership)
- [x] ANTHROPIC_API_KEY guard in every route
- [x] Escape key closes all modals
- [x] Error handling: shows "Erro ao gerar. Tenta novamente." inside modals
- [x] Non-streaming (Feature 3) vs streaming (Features 1, 2, 4, 5)
- [x] Sentinel pattern for Feature 4 (---SUBTASKS---)
- [x] LEVEL: header for Feature 5 (risk level badge)
- [x] Feature 3: chip only shown when assigned_to === null and org has >1 member
- [x] Feature 4: button label changes to "Regenerar descrição" when description exists
- [x] Feature 1: preview tree before inserting, disabled "Inserir" during streaming
