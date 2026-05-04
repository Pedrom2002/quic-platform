# Clients CRUD, Portal Link Send, Message Templates CRUD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add edit/deactivate to the global clients page, a "send portal link" button on the event detail page, and create/edit/deactivate for message templates on the templates page.

**Architecture:** All mutations use Server Actions (same pattern as `app/dashboard/events/[eventId]/clients/actions.ts`). UI uses Dialog + shadcn/ui components, no new pages. Zod schema added to `schemas/` for message template validation.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (server client), Zod, shadcn/ui, Brevo (sendEmail), TypeScript.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `app/dashboard/clients/actions.ts` | Create | Server Actions: updateClient, deactivateClient |
| `app/dashboard/clients/page.tsx` | Modify | Add EditClientDialog inline, wire actions |
| `app/dashboard/events/[eventId]/actions.ts` | Create | Server Action: sendPortalLinkAction |
| `app/dashboard/events/[eventId]/page.tsx` | Modify | Add SendPortalButton (client component) |
| `components/events/SendPortalButton.tsx` | Create | Client component: confirm dialog + call action |
| `app/dashboard/templates/actions.ts` | Create | Server Actions: createMessageTemplate, updateMessageTemplate, deactivateMessageTemplate |
| `app/dashboard/templates/page.tsx` | Modify | Add MessageTemplateDialog, wire actions (convert to client component) |
| `schemas/template.schema.ts` | Create | Zod schema for message template create/update |

---

## Task 1: Server Actions for global clients (update + deactivate)

**Files:**
- Create: `app/dashboard/clients/actions.ts`

- [ ] **Step 1: Create the actions file**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

async function resolveOrg(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('auth_user_id', userId)
    .single()
  return data
}

async function assertClientOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  organizationId: string
) {
  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('organization_id', organizationId)
    .single()
  return !!data
}

export async function updateClientAction(
  clientId: string,
  updates: { full_name: string; email: string; phone: string; company: string }
) {
  if (!updates.full_name.trim()) throw new Error('Nome obrigatório')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrg(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  const owns = await assertClientOwnership(supabase, clientId, member.organization_id)
  if (!owns) throw new Error('Cliente não encontrado')

  const { error } = await supabase
    .from('clients')
    .update({
      full_name: updates.full_name.trim(),
      email: updates.email.trim() || null,
      phone: updates.phone.trim() || null,
      company: updates.company.trim() || null,
    })
    .eq('id', clientId)
  if (error) throw new Error(error.message)
}

export async function deactivateClientAction(clientId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrg(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  const owns = await assertClientOwnership(supabase, clientId, member.organization_id)
  if (!owns) throw new Error('Cliente não encontrado')

  const { error } = await supabase
    .from('clients')
    .update({ is_active: false })
    .eq('id', clientId)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/clients/actions.ts
git commit -m "feat: server actions for editing and deactivating global clients"
```

---

## Task 2: Edit/deactivate UI on global clients page

**Files:**
- Modify: `app/dashboard/clients/page.tsx`

The page must become a Client Component (needs state for dialogs). It will load clients once on mount via a `loadClientsAction`, re-fetch after mutations.

- [ ] **Step 1: Add a loadClientsAction to `app/dashboard/clients/actions.ts`**

Append to `app/dashboard/clients/actions.ts`:

```typescript
export async function loadClientsAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrg(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('organization_id', member.organization_id)
    .eq('is_active', true)
    .order('full_name')

  return data ?? []
}
```

- [ ] **Step 2: Replace `app/dashboard/clients/page.tsx` with client component**

```typescript
'use client'

import { useEffect, useState, useTransition } from 'react'
import { Mail, Phone, Building2, Pencil, UserMinus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Client } from '@/types/database'
import { loadClientsAction, updateClientAction, deactivateClientAction } from './actions'

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', company: '' })
  const [isPending, startTransition] = useTransition()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      setClients(await loadClientsAction())
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }

  function openEdit(client: Client) {
    setForm({
      full_name: client.full_name,
      email: client.email ?? '',
      phone: client.phone ?? '',
      company: (client as Client & { company?: string | null }).company ?? '',
    })
    setEditing(client)
  }

  function saveEdit() {
    if (!editing) return
    startTransition(async () => {
      try {
        await updateClientAction(editing.id, form)
        toast.success('Cliente atualizado')
        setEditing(null)
        await load()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      }
    })
  }

  function deactivate(clientId: string) {
    if (!confirm('Desativar este cliente? Será removido do directório.')) return
    startTransition(async () => {
      try {
        await deactivateClientAction(clientId)
        toast.success('Cliente desativado')
        await load()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      }
    })
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
        <p className="text-slate-500 mt-1">{clients.length} contactos no directório</p>
      </div>

      {loading ? (
        <p className="text-slate-400">A carregar...</p>
      ) : !clients.length ? (
        <div className="text-center py-20">
          <p className="text-slate-400">Nenhum cliente registado ainda.</p>
          <p className="text-slate-300 text-sm mt-1">Os clientes são criados ao adicioná-los a um evento.</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {clients.map(client => (
            <div
              key={client.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200"
            >
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <span className="text-slate-500 text-sm font-medium">
                  {client.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-800 font-medium">{client.full_name}</p>
                <div className="flex items-center gap-4 mt-0.5">
                  {client.email && (
                    <span className="flex items-center gap-1 text-slate-400 text-xs">
                      <Mail className="w-3 h-3" />{client.email}
                    </span>
                  )}
                  {client.phone && (
                    <span className="flex items-center gap-1 text-slate-400 text-xs">
                      <Phone className="w-3 h-3" />{client.phone}
                    </span>
                  )}
                  {client.company && (
                    <span className="flex items-center gap-1 text-slate-300 text-xs">
                      <Building2 className="w-3 h-3" />{client.company}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => openEdit(client)} className="text-slate-400 hover:text-slate-700">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deactivate(client.id)} disabled={isPending} className="text-slate-300 hover:text-red-500">
                  <UserMinus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={open => { if (!open) setEditing(null) }}>
        <DialogContent className="bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Editar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-slate-700">Nome *</Label>
              <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700">Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700">Telefone</Label>
              <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700">Empresa</Label>
              <Input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
            </div>
            <Button onClick={saveEdit} disabled={!form.full_name || isPending} className="w-full">
              {isPending ? 'A guardar...' : 'Guardar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 3: Verify `company` field usage**

`company` IS in the `Client` Row type (`types/database.ts:323`), so use `client.company` directly everywhere — no cast needed. The code above already uses `client.company` without casts.

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/clients/page.tsx app/dashboard/clients/actions.ts
git commit -m "feat: edit and deactivate clients from global clients page"
```

---

## Task 3: Send portal link — server action

**Files:**
- Create: `app/dashboard/events/[eventId]/actions.ts`

- [ ] **Step 1: Create the actions file**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { sendEmail, buildEmailHtml } from '@/lib/notifications/channels/email'

async function resolveOrg(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('auth_user_id', userId)
    .single()
  return data
}

export async function sendPortalLinkAction(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrg(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  const { data: event } = await supabase
    .from('events')
    .select('id, name, portal_token, organization_id')
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!event) throw new Error('Evento não encontrado')

  const { data: eventClients } = await supabase
    .from('event_clients')
    .select('*, client:clients(full_name, email)')
    .eq('event_id', eventId)
    .eq('opted_out', false)

  const portalBase = process.env.NEXT_PUBLIC_PORTAL_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
  const portalUrl = `${portalBase}/portal/${event.portal_token}`

  const recipients = (eventClients ?? []).filter(
    ec => (ec.notification_prefs as { channels?: string[] })?.channels?.includes('email') ?? true
  )

  if (!recipients.length) throw new Error('Nenhum cliente com email configurado para este evento')

  const errors: string[] = []
  for (const ec of recipients) {
    const client = ec.client as { full_name: string; email: string | null } | null
    if (!client?.email) continue
    try {
      const body = `Olá ${client.full_name},\n\nPode acompanhar o estado do seu evento em tempo real através do portal:\n\n${portalUrl}\n\nO link é pessoal e válido durante 90 dias.`
      const html = buildEmailHtml(body, event.name)
      await sendEmail({
        to: client.email,
        toName: client.full_name,
        subject: `Portal do evento: ${event.name}`,
        html,
      })
    } catch (err: unknown) {
      errors.push(client.email)
      console.error('[sendPortalLink]', err instanceof Error ? err.message : err)
    }
  }

  if (errors.length) throw new Error(`Falhou o envio para: ${errors.join(', ')}`)
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/dashboard/events/[eventId]/actions.ts"
git commit -m "feat: server action to send portal link email to event clients"
```

---

## Task 4: Send portal link — UI button on event detail page

**Files:**
- Create: `components/events/SendPortalButton.tsx`
- Modify: `app/dashboard/events/[eventId]/page.tsx`

- [ ] **Step 1: Create SendPortalButton component**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { sendPortalLinkAction } from '@/app/dashboard/events/[eventId]/actions'

interface Props {
  eventId: string
}

export function SendPortalButton({ eventId }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function send() {
    startTransition(async () => {
      try {
        await sendPortalLinkAction(eventId)
        toast.success('Link do portal enviado por email')
        setOpen(false)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao enviar email')
      }
    })
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Send className="w-3.5 h-3.5 mr-1.5" />
        Enviar portal
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white border-slate-200 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Enviar link do portal</DialogTitle>
          </DialogHeader>
          <p className="text-slate-500 text-sm mt-1">
            Será enviado um email com o link do portal a todos os clientes deste evento que têm email configurado.
          </p>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1" disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={send} disabled={isPending} className="flex-1">
              {isPending ? 'A enviar...' : 'Confirmar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

- [ ] **Step 2: Add SendPortalButton to event detail page**

In `app/dashboard/events/[eventId]/page.tsx`, find the imports block and add:

```typescript
import { SendPortalButton } from '@/components/events/SendPortalButton'
```

Find the button group that contains the `Pencil` / Editar link (around line 70 of the return). Add `SendPortalButton` beside it:

```tsx
<SendPortalButton eventId={eventId} />
<Link
  href={`/dashboard/events/${eventId}/edit`}
  className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
>
  <Pencil className="w-3.5 h-3.5" />
  Editar
</Link>
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/events/SendPortalButton.tsx "app/dashboard/events/[eventId]/page.tsx"
git commit -m "feat: send portal link button on event detail page"
```

---

## Task 5: Zod schema for message templates

**Files:**
- Create: `schemas/template.schema.ts`

- [ ] **Step 1: Create schema**

```typescript
import { z } from 'zod'

export const messageTemplateSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  channel: z.enum(['email', 'whatsapp', 'sms', 'portal']),
  language: z.enum(['pt', 'en']).default('pt'),
  subject: z.string().optional(),
  body_template: z.string().min(1, 'Corpo obrigatório'),
})

export type MessageTemplateInput = z.infer<typeof messageTemplateSchema>
```

- [ ] **Step 2: Commit**

```bash
git add schemas/template.schema.ts
git commit -m "feat: zod schema for message template create/update"
```

---

## Task 6: Server actions for message templates

**Files:**
- Create: `app/dashboard/templates/actions.ts`

- [ ] **Step 1: Create the actions file**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { messageTemplateSchema, type MessageTemplateInput } from '@/schemas/template.schema'

async function resolveOrg(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('auth_user_id', userId)
    .single()
  return data
}

export async function loadMessageTemplatesAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrg(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  const { data } = await supabase
    .from('message_templates')
    .select('*')
    .eq('organization_id', member.organization_id)
    .eq('is_active', true)
    .order('name')
  return data ?? []
}

export async function createMessageTemplateAction(input: MessageTemplateInput) {
  const parsed = messageTemplateSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.errors[0].message)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrg(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  const { error } = await supabase
    .from('message_templates')
    .insert({ ...parsed.data, organization_id: member.organization_id })
  if (error) throw new Error(error.message)
}

export async function updateMessageTemplateAction(id: string, input: MessageTemplateInput) {
  const parsed = messageTemplateSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.errors[0].message)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrg(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  const { data: existing } = await supabase
    .from('message_templates')
    .select('id')
    .eq('id', id)
    .eq('organization_id', member.organization_id)
    .single()
  if (!existing) throw new Error('Template não encontrado')

  const { error } = await supabase
    .from('message_templates')
    .update(parsed.data)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deactivateMessageTemplateAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrg(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  const { data: existing } = await supabase
    .from('message_templates')
    .select('id')
    .eq('id', id)
    .eq('organization_id', member.organization_id)
    .single()
  if (!existing) throw new Error('Template não encontrado')

  const { error } = await supabase
    .from('message_templates')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/templates/actions.ts
git commit -m "feat: server actions for message template CRUD"
```

---

## Task 7: Message templates CRUD UI

**Files:**
- Modify: `app/dashboard/templates/page.tsx`

The page becomes a client component. Checklist templates section stays read-only (server-fetched data passed as prop from a thin wrapper, or fetched on mount). Message templates section gets create/edit/deactivate dialogs.

- [ ] **Step 1: Replace `app/dashboard/templates/page.tsx`**

```typescript
'use client'

import { useEffect, useState, useTransition } from 'react'
import { CheckSquare, FileText, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { MessageTemplate } from '@/types/database'
import type { MessageTemplateInput } from '@/schemas/template.schema'
import {
  loadMessageTemplatesAction,
  createMessageTemplateAction,
  updateMessageTemplateAction,
  deactivateMessageTemplateAction,
} from './actions'
import { createClient } from '@/lib/supabase/client'
import type { TemplateWithJoins } from '@/types/app'

const EMPTY_FORM: MessageTemplateInput = {
  name: '',
  channel: 'email',
  language: 'pt',
  subject: '',
  body_template: '',
}

export default function TemplatesPage() {
  const [checklistTemplates, setChecklistTemplates] = useState<TemplateWithJoins[]>([])
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MessageTemplate | null>(null)
  const [form, setForm] = useState<MessageTemplateInput>(EMPTY_FORM)
  const [isPending, startTransition] = useTransition()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const supabase = createClient()
      const [{ data: ct }, msgTemplates] = await Promise.all([
        supabase
          .from('checklist_templates')
          .select('*, event_types(name, color), checklist_template_items(id)')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        loadMessageTemplatesAction(),
      ])
      setChecklistTemplates((ct ?? []) as unknown as TemplateWithJoins[])
      setMessageTemplates(msgTemplates)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar templates')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(t: MessageTemplate) {
    setEditing(t)
    setForm({
      name: t.name,
      channel: t.channel as MessageTemplateInput['channel'],
      language: (t.language ?? 'pt') as MessageTemplateInput['language'],
      subject: t.subject ?? '',
      body_template: t.body_template,
    })
    setDialogOpen(true)
  }

  function save() {
    startTransition(async () => {
      try {
        if (editing) {
          await updateMessageTemplateAction(editing.id, form)
          toast.success('Template atualizado')
        } else {
          await createMessageTemplateAction(form)
          toast.success('Template criado')
        }
        setDialogOpen(false)
        await loadAll()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      }
    })
  }

  function deactivate(id: string) {
    if (!confirm('Desativar este template?')) return
    startTransition(async () => {
      try {
        await deactivateMessageTemplateAction(id)
        toast.success('Template desativado')
        await loadAll()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      }
    })
  }

  const canSave = form.name.trim().length > 0 && form.body_template.trim().length > 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Templates</h1>
        <p className="text-slate-500 mt-1">Checklists e mensagens pré-definidas por tipo de evento</p>
      </div>

      {/* Checklist templates — read only */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Checklists
        </h2>
        {loading ? (
          <p className="text-slate-400 text-sm">A carregar...</p>
        ) : !checklistTemplates.length ? (
          <p className="text-slate-400 text-sm">Nenhum template de checklist encontrado.</p>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
            {checklistTemplates.map(t => {
              const etColor = t.event_types?.color ?? '#6b7280'
              const itemCount = t.checklist_template_items?.length ?? 0
              return (
                <div key={t.id} className="flex items-center gap-4 px-5 py-4">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: etColor + '20' }}
                  >
                    <CheckSquare className="w-4 h-4" style={{ color: etColor }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-800 font-medium">{t.name}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{t.event_types?.name} · {itemCount} etapas</p>
                  </div>
                  <span className="text-xs text-slate-300">v{t.version}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Message templates — full CRUD */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Templates de Mensagem
          </h2>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Novo template
          </Button>
        </div>

        {loading ? (
          <p className="text-slate-400 text-sm">A carregar...</p>
        ) : !messageTemplates.length ? (
          <p className="text-slate-400 text-sm">Nenhum template de mensagem encontrado.</p>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
            {messageTemplates.map(m => (
              <div key={m.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-violet-500" />
                </div>
                <div className="flex-1">
                  <p className="text-slate-800 font-medium">{m.name}</p>
                  <p className="text-slate-400 text-xs mt-0.5 capitalize">{m.channel} · {m.language}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(m)} className="text-slate-400 hover:text-slate-700">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deactivate(m.id)} disabled={isPending} className="text-slate-300 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) setDialogOpen(false) }}>
        <DialogContent className="bg-white border-slate-200 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-900">
              {editing ? 'Editar Template' : 'Novo Template de Mensagem'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-slate-700">Nome *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Confirmação de entrega"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-700">Canal</Label>
                <Select
                  value={form.channel}
                  onValueChange={v => setForm(p => ({ ...p, channel: v as MessageTemplateInput['channel'] }))}
                >
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="portal">Portal</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700">Idioma</Label>
                <Select
                  value={form.language}
                  onValueChange={v => setForm(p => ({ ...p, language: v as MessageTemplateInput['language'] }))}
                >
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt">Português</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.channel === 'email' && (
              <div className="space-y-1.5">
                <Label className="text-slate-700">Assunto</Label>
                <Input
                  value={form.subject}
                  onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  placeholder="Ex: Atualização do seu evento — {{event_name}}"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-slate-700">Corpo *</Label>
              <Textarea
                value={form.body_template}
                onChange={e => setForm(p => ({ ...p, body_template: e.target.value }))}
                rows={6}
                placeholder="Olá {{client_name}},&#10;&#10;O item {{item_client_label}} foi concluído.&#10;&#10;{{portal_url}}"
                className="font-mono text-sm resize-y"
              />
              <p className="text-xs text-slate-400">
                Variáveis: {'{{client_name}}'}, {'{{event_name}}'}, {'{{event_date}}'}, {'{{item_client_label}}'}, {'{{portal_url}}'}, {'{{progress_percent}}'}
              </p>
            </div>
            <Button onClick={save} disabled={!canSave || isPending} className="w-full">
              {isPending ? 'A guardar...' : editing ? 'Guardar alterações' : 'Criar template'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Run tests to verify nothing broke**

```bash
npm test
```

Expected: 5 test files, 43 tests passing.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/templates/page.tsx app/dashboard/templates/actions.ts schemas/template.schema.ts
git commit -m "feat: create, edit, deactivate message templates from templates page"
```

---

## Task 8: Final typecheck + test run

- [ ] **Step 1: Full typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 2: Full test suite**

```bash
npm test
```

Expected: 5 test files, 43 tests passing.

- [ ] **Step 3: Verify build output (optional)**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds with no type errors. Fix any issues before merging.
