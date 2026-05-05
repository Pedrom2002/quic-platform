# Activity Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar uma timeline em tempo real de checklist, notificações e clientes na página do evento.

**Architecture:** Query em paralelo às 3 tabelas no servidor, merge por timestamp em `lib/timeline.ts`. `ActivityFeed` é um Client Component que recebe os dados iniciais e escuta Supabase Realtime para atualizar em tempo real.

**Tech Stack:** Next.js App Router, Supabase Realtime, TypeScript, Tailwind, date-fns

---

## Ficheiros

| Ficheiro | Tipo |
|---|---|
| `lib/timeline.ts` | Criar — tipos + função mergeTimelineEvents |
| `components/events/ActivityFeed.tsx` | Criar — Client Component com realtime |
| `app/dashboard/events/[eventId]/page.tsx` | Modificar — query inicial + ActivityFeed |

---

### Task 1: Tipos e função de merge em `lib/timeline.ts`

**Files:**
- Create: `lib/timeline.ts`
- Test: `__tests__/timeline.test.ts`

- [ ] **Step 1: Escrever teste falhante**

```typescript
// __tests__/timeline.test.ts
import { describe, it, expect } from 'vitest'
import { mergeTimelineEvents } from '@/lib/timeline'

describe('mergeTimelineEvents', () => {
  it('merges and sorts by timestamp descending', () => {
    const checklist = [{
      type: 'checklist' as const,
      id: 'c1',
      item_title: 'Sonoplastia',
      status: 'completed',
      member_name: 'João',
      timestamp: '2026-05-05T10:00:00Z',
    }]
    const notifications = [{
      type: 'notification' as const,
      id: 'n1',
      client_name: 'Ana',
      channel: 'email',
      status: 'delivered',
      timestamp: '2026-05-05T11:00:00Z',
    }]
    const clients = [{
      type: 'client' as const,
      id: 'ec1',
      client_name: 'Carlos',
      action: 'added' as const,
      role: 'primary_contact',
      timestamp: '2026-05-05T09:00:00Z',
    }]
    const result = mergeTimelineEvents(checklist, notifications, clients)
    expect(result).toHaveLength(3)
    expect(result[0].id).toBe('n1')  // 11:00 first
    expect(result[1].id).toBe('c1')  // 10:00 second
    expect(result[2].id).toBe('ec1') // 09:00 last
  })

  it('limits to 30 events', () => {
    const checklist = Array.from({ length: 35 }, (_, i) => ({
      type: 'checklist' as const,
      id: `c${i}`,
      item_title: 'Item',
      status: 'completed',
      member_name: null,
      timestamp: `2026-05-05T${String(i).padStart(2, '0')}:00:00Z`,
    }))
    const result = mergeTimelineEvents(checklist, [], [])
    expect(result).toHaveLength(30)
  })
})
```

- [ ] **Step 2: Correr teste para confirmar que falha**

```bash
npx vitest run __tests__/timeline.test.ts
```

Expected: FAIL com "Cannot find module '@/lib/timeline'"

- [ ] **Step 3: Implementar `lib/timeline.ts`**

```typescript
export interface ChecklistTimelineEvent {
  type: 'checklist'
  id: string
  item_title: string
  status: string
  member_name: string | null
  timestamp: string
}

export interface NotificationTimelineEvent {
  type: 'notification'
  id: string
  client_name: string
  channel: string
  status: string
  timestamp: string
}

export interface ClientTimelineEvent {
  type: 'client'
  id: string
  client_name: string
  action: 'added' | 'removed'
  role: string
  timestamp: string
}

export type TimelineEvent = ChecklistTimelineEvent | NotificationTimelineEvent | ClientTimelineEvent

export function mergeTimelineEvents(
  checklist: ChecklistTimelineEvent[],
  notifications: NotificationTimelineEvent[],
  clients: ClientTimelineEvent[],
): TimelineEvent[] {
  return [...checklist, ...notifications, ...clients]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 30)
}
```

- [ ] **Step 4: Correr teste para confirmar que passa**

```bash
npx vitest run __tests__/timeline.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/timeline.ts __tests__/timeline.test.ts
git commit -m "feat: timeline merge utility with tests"
```

---

### Task 2: Componente `ActivityFeed` com Realtime

**Files:**
- Create: `components/events/ActivityFeed.tsx`

- [ ] **Step 1: Criar `components/events/ActivityFeed.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'
import { CheckCircle2, Bell, UserPlus } from 'lucide-react'
import type { TimelineEvent, ChecklistTimelineEvent, NotificationTimelineEvent, ClientTimelineEvent } from '@/lib/timeline'
import { mergeTimelineEvents } from '@/lib/timeline'

const STATUS_PT: Record<string, string> = {
  completed: 'concluído',
  in_progress: 'em progresso',
  skipped: 'ignorado',
  pending: 'reposto',
  delivered: 'entregue',
  failed: 'falhou',
  queued: 'na fila',
}

const CHANNEL_PT: Record<string, string> = {
  email: 'email',
  portal: 'portal',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
}

const ROLE_PT: Record<string, string> = {
  primary_contact: 'Contacto Principal',
  cc: 'CC',
  vip: 'VIP',
  vendor: 'Fornecedor',
}

function eventLabel(event: TimelineEvent): string {
  if (event.type === 'checklist') {
    const who = event.member_name ? ` por ${event.member_name}` : ''
    return `"${event.item_title}" marcado como ${STATUS_PT[event.status] ?? event.status}${who}`
  }
  if (event.type === 'notification') {
    return `Notificação via ${CHANNEL_PT[event.channel] ?? event.channel} para ${event.client_name} — ${STATUS_PT[event.status] ?? event.status}`
  }
  const action = event.action === 'added' ? 'adicionado' : 'removido'
  return `${event.client_name} ${action} como ${ROLE_PT[event.role] ?? event.role}`
}

function EventIcon({ type }: { type: TimelineEvent['type'] }) {
  if (type === 'checklist') return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
  if (type === 'notification') return <Bell className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
  return <UserPlus className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
}

interface ActivityFeedProps {
  eventId: string
  initialEvents: TimelineEvent[]
}

export function ActivityFeed({ eventId, initialEvents }: ActivityFeedProps) {
  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents)

  useEffect(() => {
    const supabase = createClient()

    function prependEvent(event: TimelineEvent) {
      setEvents(prev => [event, ...prev].slice(0, 30))
    }

    const channel = supabase
      .channel(`activity:${eventId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'event_checklist_items',
        filter: `event_id=eq.${eventId}`,
      }, (payload) => {
        const row = payload.new as { id: string; title: string; client_label: string | null; status: string; updated_at: string }
        prependEvent({
          type: 'checklist',
          id: row.id,
          item_title: row.client_label ?? row.title,
          status: row.status,
          member_name: null,
          timestamp: row.updated_at,
        })
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notification_jobs',
        filter: `event_id=eq.${eventId}`,
      }, (payload) => {
        const row = payload.new as { id: string; channel: string; status: string; created_at: string }
        prependEvent({
          type: 'notification',
          id: row.id,
          client_name: 'Cliente',
          channel: row.channel,
          status: row.status,
          timestamp: row.created_at,
        })
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'event_clients',
        filter: `event_id=eq.${eventId}`,
      }, (payload) => {
        const row = payload.new as { id: string; role: string; created_at: string }
        prependEvent({
          type: 'client',
          id: row.id,
          client_name: 'Cliente',
          action: 'added',
          role: row.role,
          timestamp: row.created_at,
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  if (!events.length) return null

  return (
    <div className="mt-6 bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <h2 className="text-sm font-semibold text-slate-700 mb-4">Atividade Recente</h2>
      <ul className="space-y-3">
        {events.map((event, idx) => (
          <li key={`${event.type}-${event.id}-${idx}`} className="flex gap-3">
            <EventIcon type={event.type} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700">{eventLabel(event)}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true, locale: pt })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/events/ActivityFeed.tsx
git commit -m "feat: ActivityFeed client component with realtime"
```

---

### Task 3: Integrar na página do evento

**Files:**
- Modify: `app/dashboard/events/[eventId]/page.tsx`

- [ ] **Step 1: Adicionar queries e ActivityFeed à página**

Adicionar imports no topo de `app/dashboard/events/[eventId]/page.tsx`:

```typescript
import { ActivityFeed } from '@/components/events/ActivityFeed'
import { mergeTimelineEvents } from '@/lib/timeline'
import type { ChecklistTimelineEvent, NotificationTimelineEvent, ClientTimelineEvent } from '@/lib/timeline'
```

Adicionar queries a seguir às queries existentes (após `clientCount`):

```typescript
  const [{ data: checklistActivity }, { data: notifActivity }, { data: clientActivity }] = await Promise.all([
    supabase
      .from('event_checklist_items')
      .select('id, title, client_label, status, updated_at')
      .eq('event_id', eventId)
      .not('status', 'eq', 'pending')
      .order('updated_at', { ascending: false })
      .limit(30),
    supabase
      .from('notification_jobs')
      .select('id, channel, status, sent_at, created_at, clients(full_name)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('event_clients')
      .select('id, role, created_at, clients(full_name)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const checklistEvents: ChecklistTimelineEvent[] = (checklistActivity ?? []).map(r => ({
    type: 'checklist',
    id: r.id,
    item_title: r.client_label ?? r.title,
    status: r.status,
    member_name: null,
    timestamp: r.updated_at,
  }))

  const notifEvents: NotificationTimelineEvent[] = (notifActivity ?? []).map(r => {
    const client = r.clients as { full_name: string } | null
    return {
      type: 'notification',
      id: r.id,
      client_name: client?.full_name ?? 'Cliente',
      channel: r.channel,
      status: r.status,
      timestamp: r.sent_at ?? r.created_at,
    }
  })

  const clientEvents: ClientTimelineEvent[] = (clientActivity ?? []).map(r => {
    const client = r.clients as { full_name: string } | null
    return {
      type: 'client',
      id: r.id,
      client_name: client?.full_name ?? 'Cliente',
      action: 'added',
      role: r.role,
      timestamp: r.created_at,
    }
  })

  const initialTimelineEvents = mergeTimelineEvents(checklistEvents, notifEvents, clientEvents)
```

Adicionar `<ActivityFeed>` no JSX, a seguir à grid de quick links:

```tsx
      {/* Activity Feed */}
      <ActivityFeed eventId={eventId} initialEvents={initialTimelineEvents} />
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/events/[eventId]/page.tsx
git commit -m "feat: activity timeline on event detail page"
```

- [ ] **Step 4: Push**

```bash
git push origin master
```
