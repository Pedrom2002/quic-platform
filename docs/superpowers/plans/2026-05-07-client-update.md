# Client Update AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Atualizar Cliente" AI button to the event detail page that generates a client-friendly email update, lets staff review/edit it, and sends it via Brevo.

**Architecture:** New route handler `POST /api/ai/client-update` streams a Haiku-generated message into an editable textarea. A new server action `sendClientUpdateAction` sends the final text via the existing Brevo email infrastructure. A new `ClientUpdateModal` component handles the full UI flow. `AIButtons.tsx` gains a third button and receives a `clientCount` prop.

**Tech Stack:** `@anthropic-ai/sdk`, Next.js Route Handlers + Server Actions, Supabase Auth, Brevo via existing `sendEmail`/`buildEmailHtml` helpers, React `useState`/`useEffect`

---

## File Map

| Action | File |
|---|---|
| Create | `app/api/ai/client-update/route.ts` |
| Create | `components/events/ClientUpdateModal.tsx` |
| Modify | `app/dashboard/events/[eventId]/actions.ts` |
| Modify | `components/events/AIButtons.tsx` |
| Modify | `app/dashboard/events/[eventId]/page.tsx` |

---

## Task 1: Route Handler — POST /api/ai/client-update

**Files:**
- Create: `app/api/ai/client-update/route.ts`

- [ ] **Step 1: Create the directory and file**

Create `app/api/ai/client-update/route.ts` with this exact content:

```typescript
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
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "client-update"
```

Expected: no output (no errors)

- [ ] **Step 3: Commit**

```bash
git add app/api/ai/client-update/route.ts
git commit -m "feat: POST /api/ai/client-update route handler"
```

---

## Task 2: Server Action — sendClientUpdateAction

**Files:**
- Modify: `app/dashboard/events/[eventId]/actions.ts`

The existing file already has `sendPortalLinkAction`. Add `sendClientUpdateAction` after it.

- [ ] **Step 1: Read the current end of the actions file**

Read `app/dashboard/events/[eventId]/actions.ts` to confirm the last line number and existing imports (`sendEmail`, `buildEmailHtml`, `resolveOrgMember` are already imported).

- [ ] **Step 2: Append the new action**

Add this function at the end of `app/dashboard/events/[eventId]/actions.ts`:

```typescript
export async function sendClientUpdateAction(
  eventId: string,
  text: string
): Promise<{ sent: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  const { data: event } = await supabase
    .from('events')
    .select('id, name, organization_id')
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!event) throw new Error('Evento não encontrado')

  const { data: eventClients } = await supabase
    .from('event_clients')
    .select('*, client:clients(full_name, email)')
    .eq('event_id', eventId)
    .eq('opted_out', false)

  type EmailableClient = { full_name: string; email: string }

  const recipients = (eventClients ?? [])
    .filter(ec => (ec.notification_prefs as { channels?: string[] })?.channels?.includes('email') ?? true)
    .flatMap(ec => {
      const client = ec.client as { full_name: string; email: string | null } | null
      return client?.email ? [{ full_name: client.full_name, email: client.email } as EmailableClient] : []
    })

  if (!recipients.length) throw new Error('Nenhum cliente com email configurado para este evento')

  let sent = 0
  const errors: string[] = []
  for (const client of recipients) {
    try {
      const html = buildEmailHtml(text, event.name)
      await sendEmail({
        to: client.email,
        toName: client.full_name,
        subject: `Atualização do evento: ${event.name}`,
        html,
      })
      sent++
    } catch (err: unknown) {
      errors.push(client.email)
      console.error('[sendClientUpdate]', err instanceof Error ? err.message : err)
    }
  }

  if (errors.length && sent === 0) throw new Error(`Falhou o envio para todos os destinatários: ${errors.join(', ')}`)
  if (errors.length) throw new Error(`Enviado para ${sent} de ${recipients.length}. Falhou: ${errors.join(', ')}`)

  return { sent }
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "actions"
```

Expected: no errors in this file

- [ ] **Step 4: Commit**

```bash
git add "app/dashboard/events/[eventId]/actions.ts"
git commit -m "feat: sendClientUpdateAction server action"
```

---

## Task 3: ClientUpdateModal Component

**Files:**
- Create: `components/events/ClientUpdateModal.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { X, MessageSquare, Loader2, Send } from 'lucide-react'
import { sendClientUpdateAction } from '@/app/dashboard/events/[eventId]/actions'

const FOCUS_OPTIONS = [
  'Update geral de progresso',
  'Confirmação de detalhes do evento',
  'Aviso de prazo / item pendente',
  'Mensagem de boas-vindas',
]

interface Props {
  eventId: string
  clientCount: number
  onClose: () => void
}

export default function ClientUpdateModal({ eventId, clientCount, onClose }: Props) {
  const [focus, setFocus] = useState(FOCUS_OPTIONS[0])
  const [text, setText] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<number | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleGenerate() {
    setStreaming(true)
    setText('')
    setError(null)
    setSent(null)

    try {
      const res = await fetch('/api/ai/client-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, focus }),
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
      setError('Erro ao gerar. Tenta novamente.')
    } finally {
      setStreaming(false)
    }
  }

  async function handleSend() {
    if (!text.trim() || sending) return
    setSending(true)
    setError(null)

    try {
      const result = await sendClientUpdateAction(eventId, text.trim())
      setSent(result.sent)
      setTimeout(onClose, 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar. Tenta novamente.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-green-600" />
            <h2 className="text-sm font-semibold text-slate-800">Atualizar cliente</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Focus selector */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Foco da mensagem</label>
            <div className="flex gap-2">
              <select
                value={focus}
                onChange={e => setFocus(e.target.value)}
                disabled={streaming}
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-300 disabled:opacity-50"
              >
                {FOCUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <button
                onClick={handleGenerate}
                disabled={streaming}
                className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {streaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {streaming ? 'A gerar...' : 'Gerar'}
              </button>
            </div>
          </div>

          {/* Generated text */}
          {(text || streaming) && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Mensagem {streaming ? <span className="text-slate-400">(a gerar...)</span> : <span className="text-slate-400">(editável)</span>}
              </label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                disabled={streaming}
                rows={10}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-300 resize-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
          {sent !== null && (
            <p className="text-sm text-green-600 font-medium">Enviado para {sent} cliente{sent !== 1 ? 's' : ''}.</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <span className="text-xs text-slate-400">{clientCount} cliente{clientCount !== 1 ? 's' : ''} com email</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 text-slate-500 hover:text-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSend}
              disabled={!text.trim() || streaming || sending || sent !== null}
              className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Enviar a {clientCount} cliente{clientCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "ClientUpdateModal"
```

Expected: no output

- [ ] **Step 3: Commit**

```bash
git add components/events/ClientUpdateModal.tsx
git commit -m "feat: ClientUpdateModal component"
```

---

## Task 4: Wire up AIButtons + event detail page

**Files:**
- Modify: `components/events/AIButtons.tsx`
- Modify: `app/dashboard/events/[eventId]/page.tsx`

- [ ] **Step 1: Read current AIButtons.tsx**

Read `components/events/AIButtons.tsx` to confirm current content (it has `showSummary`, `showRisk` states and two buttons).

- [ ] **Step 2: Rewrite AIButtons.tsx**

Replace the entire file with:

```typescript
'use client'

import { useState } from 'react'
import { Sparkles, ShieldAlert, MessageSquare } from 'lucide-react'
import dynamic from 'next/dynamic'

const EventSummaryModal = dynamic(() => import('./EventSummaryModal'))
const RiskAnalysisModal = dynamic(() => import('./RiskAnalysisModal'))
const ClientUpdateModal = dynamic(() => import('./ClientUpdateModal'))

interface Props {
  eventId: string
  clientCount: number
}

export default function AIButtons({ eventId, clientCount }: Props) {
  const [showSummary, setShowSummary] = useState(false)
  const [showRisk, setShowRisk] = useState(false)
  const [showUpdate, setShowUpdate] = useState(false)

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
        <button
          onClick={() => setShowUpdate(true)}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 border border-green-200 text-green-600 rounded-lg hover:bg-green-50 transition-colors"
        >
          <MessageSquare className="w-4 h-4" /> Atualizar Cliente
        </button>
      </div>

      {showSummary && (
        <EventSummaryModal eventId={eventId} onClose={() => setShowSummary(false)} />
      )}
      {showRisk && (
        <RiskAnalysisModal eventId={eventId} onClose={() => setShowRisk(false)} />
      )}
      {showUpdate && (
        <ClientUpdateModal
          eventId={eventId}
          clientCount={clientCount}
          onClose={() => setShowUpdate(false)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 3: Update event detail page to pass clientCount to AIButtons**

Read `app/dashboard/events/[eventId]/page.tsx` and find the `<AIButtons eventId={eventId} />` line (around line 286). Replace it with:

```tsx
<AIButtons eventId={eventId} clientCount={clientCount ?? 0} />
```

The `clientCount` variable is already fetched earlier in the same Server Component (line ~43-46).

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors

- [ ] **Step 5: Commit**

```bash
git add components/events/AIButtons.tsx "app/dashboard/events/[eventId]/page.tsx"
git commit -m "feat: Atualizar Cliente button in AIButtons with clientCount prop"
```

---

## Spec Coverage Checklist

- [x] Route `POST /api/ai/client-update` with auth + ownership + ANTHROPIC_API_KEY guard (Task 1)
- [x] Fetch event name/date/status/venue + checklist progress + overdue count (Task 1)
- [x] Focus dropdown mapped to prompt instructions in Portuguese (Task 1)
- [x] Streaming `text/event-stream` response (Task 1)
- [x] `sendClientUpdateAction` with same auth pattern as `sendPortalLinkAction` (Task 2)
- [x] Email subject `"Atualização do evento: {name}"` (Task 2)
- [x] Filter clients by opted_out=false + email channel pref (Task 2)
- [x] Returns `{ sent: number }`, throws on all-fail (Task 2)
- [x] ClientUpdateModal: focus dropdown + Gerar button + streaming textarea + Enviar button (Task 3)
- [x] Textarea disabled during streaming, enabled after (Task 3)
- [x] Client count shown in footer (Task 3)
- [x] Success message + auto-close after send (Task 3)
- [x] Error shown as red text inside modal (Task 3)
- [x] Escape closes modal (Task 3)
- [x] Backdrop click closes modal (Task 3)
- [x] AIButtons receives `clientCount` prop (Task 4)
- [x] "Atualizar Cliente" button with MessageSquare icon + green styling (Task 4)
- [x] Dynamic import of ClientUpdateModal (Task 4)
- [x] `clientCount` passed from Server Component (Task 4)
