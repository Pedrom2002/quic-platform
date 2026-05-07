# Contacts & Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename "Clientes" to "Contactos", add contact creation, and add role-gated contact groups with a two-column browse UI.

**Architecture:** Two new DB tables (`contact_groups`, `contact_group_members`) extend the existing `clients` table without renaming it. A new route `/dashboard/contacts` replaces `/dashboard/clients` (with a 301 redirect). Server actions enforce visibility: members cannot see `admin_only` groups or contacts exclusive to them.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL + RLS), TypeScript, shadcn/ui, Tailwind CSS, lucide-react, sonner (toasts).

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/0002_contact_groups.sql` | Create | DB tables + indexes for groups |
| `lib/supabase/actions.ts` | Modify | Add `role` to `resolveOrgMember` return type |
| `next.config.ts` | Modify | 301 redirect `/dashboard/clients` -> `/dashboard/contacts` |
| `components/dashboard/Sidebar.tsx` | Modify | Update nav label + href |
| `app/dashboard/contacts/actions.ts` | Create | All contact + group server actions |
| `app/dashboard/contacts/page.tsx` | Create | Server shell that passes data to client layout |
| `components/contacts/GroupsPanel.tsx` | Create | Left panel: group list |
| `components/contacts/ContactCard.tsx` | Create | Single contact row with group tags |
| `components/contacts/ContactsList.tsx` | Create | Right panel: search + contact list |
| `components/contacts/NewContactDialog.tsx` | Create | Create contact modal |
| `components/contacts/EditContactDialog.tsx` | Create | Edit contact modal with group multi-select |
| `components/contacts/NewGroupDialog.tsx` | Create | Create group modal |
| `components/contacts/ContactsLayout.tsx` | Create | Two-column client component (state orchestrator) |
| `__tests__/contacts-actions.test.ts` | Create | Unit tests for server actions visibility logic |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/0002_contact_groups.sql`

- [ ] **Step 1: Write migration file**

```sql
-- supabase/migrations/0002_contact_groups.sql

CREATE TABLE contact_groups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  color           text,
  icon            text,
  admin_only      boolean NOT NULL DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE contact_group_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid NOT NULL REFERENCES contact_groups(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (group_id, contact_id)
);

CREATE INDEX ON contact_groups (organization_id);
CREATE INDEX ON contact_group_members (group_id);
CREATE INDEX ON contact_group_members (contact_id);

CREATE TRIGGER contact_groups_updated_at BEFORE UPDATE ON contact_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 2: Apply migration**

Run in Supabase dashboard SQL editor, or:
```bash
npx supabase db push
```
Expected: no errors, two new tables visible in Supabase table editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_contact_groups.sql
git commit -m "feat: add contact_groups and contact_group_members tables"
```

---

## Task 2: Extend resolveOrgMember to return role

**Files:**
- Modify: `lib/supabase/actions.ts`

The existing helper only returns `organization_id`. Visibility rules need `role` too.

- [ ] **Step 1: Write failing test**

Create `__tests__/contacts-actions.test.ts`:

```typescript
// __tests__/contacts-actions.test.ts
// These are unit tests for the visibility logic only — no DB calls.
// We test pure functions extracted from the actions.

import { isContactVisibleToMember } from '@/app/dashboard/contacts/actions'

describe('isContactVisibleToMember', () => {
  it('returns true when contact has no groups', () => {
    expect(isContactVisibleToMember([])).toBe(true)
  })

  it('returns true when contact has at least one non-admin group', () => {
    expect(isContactVisibleToMember([
      { admin_only: true },
      { admin_only: false },
    ])).toBe(true)
  })

  it('returns false when contact is only in admin groups', () => {
    expect(isContactVisibleToMember([
      { admin_only: true },
    ])).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/contacts-actions.test.ts
```
Expected: FAIL — `isContactVisibleToMember` not found.

- [ ] **Step 3: Update resolveOrgMember to include role**

Replace the existing `resolveOrgMember` in `lib/supabase/actions.ts`:

```typescript
'use server'

import type { createClient } from '@/lib/supabase/server'

export async function resolveOrgMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ organization_id: string; role: string } | null> {
  const { data } = await supabase
    .from('team_members')
    .select('organization_id, role')
    .eq('auth_user_id', userId)
    .single()
  return data
}

export async function assertEventOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  organizationId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('organization_id', organizationId)
    .single()
  return !!data
}
```

- [ ] **Step 4: Create the contacts actions file with the pure helper**

Create `app/dashboard/contacts/actions.ts` with just the pure function for now (rest added in Task 4):

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { resolveOrgMember } from '@/lib/supabase/actions'

// Pure visibility helper — exported for testing
export function isContactVisibleToMember(
  groups: Array<{ admin_only: boolean }>
): boolean {
  if (groups.length === 0) return true
  return groups.some(g => !g.admin_only)
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest __tests__/contacts-actions.test.ts
```
Expected: PASS — 3 tests green.

- [ ] **Step 6: Commit**

```bash
git add lib/supabase/actions.ts app/dashboard/contacts/actions.ts __tests__/contacts-actions.test.ts
git commit -m "feat: extend resolveOrgMember with role, add isContactVisibleToMember"
```

---

## Task 3: Redirect + Sidebar

**Files:**
- Modify: `next.config.ts`
- Modify: `components/dashboard/Sidebar.tsx`

- [ ] **Step 1: Add redirect in next.config.ts**

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/dashboard/clients',
        destination: '/dashboard/contacts',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
```

- [ ] **Step 2: Update Sidebar nav item**

In `components/dashboard/Sidebar.tsx`, find:
```typescript
{ href: '/dashboard/clients', label: 'Clientes', icon: Users },
```
Replace with:
```typescript
{ href: '/dashboard/contacts', label: 'Contactos', icon: Users },
```

- [ ] **Step 3: Verify redirect works**

Start dev server: `npm run dev`
Visit `http://localhost:3000/dashboard/clients` — should redirect to `/dashboard/contacts` (404 for now, that's fine).
Sidebar should now show "Contactos".

- [ ] **Step 4: Commit**

```bash
git add next.config.ts components/dashboard/Sidebar.tsx
git commit -m "feat: redirect /clients to /contacts, update sidebar label"
```

---

## Task 4: Server Actions (contacts + groups)

**Files:**
- Modify: `app/dashboard/contacts/actions.ts`

This task fills in all server actions. The file already has `isContactVisibleToMember` from Task 2.

- [ ] **Step 1: Write complete actions.ts**

Replace the entire file content:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { resolveOrgMember } from '@/lib/supabase/actions'

// Pure visibility helper — exported for testing
export function isContactVisibleToMember(
  groups: Array<{ admin_only: boolean }>
): boolean {
  if (groups.length === 0) return true
  return groups.some(g => !g.admin_only)
}

// ---- Types ----

export type ContactGroup = {
  id: string
  organization_id: string
  name: string
  description: string | null
  color: string | null
  icon: string | null
  admin_only: boolean
  created_at: string
}

export type ContactWithGroups = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  company: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  groups: Array<{ id: string; name: string; color: string | null; admin_only: boolean }>
}

// ---- Groups ----

export async function loadGroupsAction(): Promise<ContactGroup[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  let query = supabase
    .from('contact_groups')
    .select('*')
    .eq('organization_id', member.organization_id)
    .order('name')

  if (member.role !== 'admin') {
    query = query.eq('admin_only', false)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createGroupAction(input: {
  name: string
  description?: string
  color?: string
  icon?: string
  admin_only?: boolean
}): Promise<ContactGroup> {
  if (!input.name.trim()) throw new Error('Nome obrigatório')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  // Members cannot create admin_only groups
  const admin_only = member.role === 'admin' ? (input.admin_only ?? false) : false

  const { data, error } = await supabase
    .from('contact_groups')
    .insert({
      organization_id: member.organization_id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      color: input.color || null,
      icon: input.icon || null,
      admin_only,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateGroupAction(
  groupId: string,
  input: { name?: string; description?: string; color?: string; icon?: string; admin_only?: boolean }
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')
  if (member.role !== 'admin') throw new Error('Sem permissão')

  const { error } = await supabase
    .from('contact_groups')
    .update({
      ...(input.name && { name: input.name.trim() }),
      description: input.description?.trim() || null,
      color: input.color || null,
      icon: input.icon || null,
      ...(typeof input.admin_only === 'boolean' && { admin_only: input.admin_only }),
    })
    .eq('id', groupId)
    .eq('organization_id', member.organization_id)

  if (error) throw new Error(error.message)
}

export async function deleteGroupAction(groupId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')
  if (member.role !== 'admin') throw new Error('Sem permissão')

  const { error } = await supabase
    .from('contact_groups')
    .delete()
    .eq('id', groupId)
    .eq('organization_id', member.organization_id)

  if (error) throw new Error(error.message)
}

// ---- Contacts ----

export async function loadContactsAction(groupId?: string | null): Promise<ContactWithGroups[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  const isAdmin = member.role === 'admin'

  // Load contacts with their groups
  const { data, error } = await supabase
    .from('clients')
    .select(`
      id, full_name, email, phone, company, notes, is_active, created_at,
      contact_group_members (
        contact_groups ( id, name, color, admin_only )
      )
    `)
    .eq('organization_id', member.organization_id)
    .eq('is_active', true)
    .order('full_name')

  if (error) throw new Error(error.message)

  const contacts: ContactWithGroups[] = (data ?? []).map((row: any) => {
    const groups = (row.contact_group_members ?? [])
      .map((m: any) => m.contact_groups)
      .filter(Boolean)
    return {
      id: row.id,
      full_name: row.full_name,
      email: row.email,
      phone: row.phone,
      company: row.company,
      notes: row.notes,
      is_active: row.is_active,
      created_at: row.created_at,
      groups,
    }
  })

  // Apply visibility filter for non-admins
  const visible = isAdmin
    ? contacts
    : contacts.filter(c => isContactVisibleToMember(c.groups))

  // Apply group filter if requested
  if (groupId === 'none') {
    return visible.filter(c => c.groups.length === 0)
  }
  if (groupId) {
    return visible.filter(c => c.groups.some(g => g.id === groupId))
  }

  return visible
}

export async function createContactAction(input: {
  full_name: string
  email?: string
  phone?: string
  groupIds?: string[]
}): Promise<string> {
  if (!input.full_name.trim()) throw new Error('Nome obrigatório')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  const { data, error } = await supabase
    .from('clients')
    .insert({
      organization_id: member.organization_id,
      full_name: input.full_name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  if (input.groupIds?.length) {
    // Verify member is not adding to admin_only groups
    const groupIds = input.groupIds
    if (member.role !== 'admin') {
      const { data: groups } = await supabase
        .from('contact_groups')
        .select('id, admin_only')
        .in('id', groupIds)
        .eq('organization_id', member.organization_id)

      const forbidden = (groups ?? []).some(g => g.admin_only)
      if (forbidden) throw new Error('Sem permissão para adicionar a grupo admin')
    }

    const { error: memberError } = await supabase
      .from('contact_group_members')
      .insert(groupIds.map(gid => ({ group_id: gid, contact_id: data.id })))

    if (memberError) throw new Error(memberError.message)
  }

  return data.id
}

export async function updateContactAction(
  contactId: string,
  updates: { full_name: string; email: string; phone: string; company: string }
): Promise<void> {
  if (!updates.full_name.trim()) throw new Error('Nome obrigatório')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  const { error } = await supabase
    .from('clients')
    .update({
      full_name: updates.full_name.trim(),
      email: updates.email.trim() || null,
      phone: updates.phone.trim() || null,
      company: updates.company.trim() || null,
    })
    .eq('id', contactId)
    .eq('organization_id', member.organization_id)

  if (error) throw new Error(error.message)
}

export async function deactivateContactAction(contactId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  const { error } = await supabase
    .from('clients')
    .update({ is_active: false })
    .eq('id', contactId)
    .eq('organization_id', member.organization_id)

  if (error) throw new Error(error.message)
}

export async function syncContactGroupsAction(
  contactId: string,
  groupIds: string[]
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  if (member.role !== 'admin' && groupIds.length > 0) {
    const { data: groups } = await supabase
      .from('contact_groups')
      .select('id, admin_only')
      .in('id', groupIds)
      .eq('organization_id', member.organization_id)
    if ((groups ?? []).some(g => g.admin_only)) throw new Error('Sem permissão')
  }

  // Delete all existing memberships then re-insert
  await supabase.from('contact_group_members').delete().eq('contact_id', contactId)

  if (groupIds.length > 0) {
    const { error } = await supabase
      .from('contact_group_members')
      .insert(groupIds.map(gid => ({ group_id: gid, contact_id: contactId })))
    if (error) throw new Error(error.message)
  }
}
```

- [ ] **Step 2: Run tests**

```bash
npx jest __tests__/contacts-actions.test.ts
```
Expected: PASS (pure function tests still green).

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/contacts/actions.ts
git commit -m "feat: contact and group server actions with role-based visibility"
```

---

## Task 5: ContactCard component

**Files:**
- Create: `components/contacts/ContactCard.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/contacts/ContactCard.tsx
'use client'

import { Mail, Phone, Pencil, UserMinus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ContactWithGroups } from '@/app/dashboard/contacts/actions'

const PRESET_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899']

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('')
}

function getAvatarColor(name: string) {
  const idx = name.charCodeAt(0) % PRESET_COLORS.length
  return PRESET_COLORS[idx]
}

interface Props {
  contact: ContactWithGroups
  onEdit: (contact: ContactWithGroups) => void
  onDeactivate: (contactId: string) => void
  disabled?: boolean
}

export function ContactCard({ contact, onEdit, onDeactivate, disabled }: Props) {
  const color = getAvatarColor(contact.full_name)

  return (
    <div className="group flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold text-white"
        style={{ backgroundColor: color + '33', color }}
      >
        {getInitials(contact.full_name)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-zinc-100 font-medium">{contact.full_name}</p>
        <div className="flex items-center gap-4 mt-0.5">
          {contact.email && (
            <span className="flex items-center gap-1 text-zinc-500 text-xs">
              <Mail className="w-3 h-3" />{contact.email}
            </span>
          )}
          {contact.phone && (
            <span className="flex items-center gap-1 text-zinc-500 text-xs">
              <Phone className="w-3 h-3" />{contact.phone}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {contact.groups.map(g => (
          <span
            key={g.id}
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: (g.color ?? '#6366f1') + '22',
              color: g.color ?? '#818cf8',
            }}
          >
            {g.name}
          </span>
        ))}
        {contact.groups.length === 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-zinc-800 text-zinc-500">
            Sem grupo
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button size="sm" variant="ghost" onClick={() => onEdit(contact)} disabled={disabled}
          className="text-zinc-500 hover:text-zinc-200 h-8 w-8 p-0">
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDeactivate(contact.id)} disabled={disabled}
          className="text-zinc-600 hover:text-red-400 h-8 w-8 p-0">
          <UserMinus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/contacts/ContactCard.tsx
git commit -m "feat: ContactCard component with group tags"
```

---

## Task 6: NewContactDialog component

**Files:**
- Create: `components/contacts/NewContactDialog.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/contacts/NewContactDialog.tsx
'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createContactAction, type ContactGroup } from '@/app/dashboard/contacts/actions'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: ContactGroup[]
  onCreated: () => void
}

export function NewContactDialog({ open, onOpenChange, groups, onCreated }: Props) {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '' })
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  function reset() {
    setForm({ full_name: '', email: '', phone: '' })
    setSelectedGroups([])
  }

  function toggleGroup(id: string) {
    setSelectedGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  function submit() {
    startTransition(async () => {
      try {
        await createContactAction({ ...form, groupIds: selectedGroups })
        toast.success('Contacto criado')
        reset()
        onOpenChange(false)
        onCreated()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Novo Contacto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-zinc-400">Nome *</Label>
            <Input
              value={form.full_name}
              onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
              placeholder="Nome completo"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-400">Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
              placeholder="email@exemplo.pt"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-400">Telefone</Label>
            <Input
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
              placeholder="+351 900 000 000"
            />
          </div>

          {groups.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-zinc-400">Grupos (opcional)</Label>
              <div className="flex flex-wrap gap-2">
                {groups.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGroup(g.id)}
                    className="text-xs px-3 py-1 rounded-full border transition-colors"
                    style={
                      selectedGroups.includes(g.id)
                        ? { backgroundColor: (g.color ?? '#6366f1') + '33', color: g.color ?? '#818cf8', borderColor: g.color ?? '#6366f1' }
                        : { backgroundColor: 'transparent', color: '#71717a', borderColor: '#3f3f46' }
                    }
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={submit}
            disabled={!form.full_name.trim() || isPending}
            className="w-full"
          >
            {isPending ? 'A criar...' : 'Criar Contacto'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/contacts/NewContactDialog.tsx
git commit -m "feat: NewContactDialog with optional group assignment"
```

---

## Task 7: EditContactDialog component

**Files:**
- Create: `components/contacts/EditContactDialog.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/contacts/EditContactDialog.tsx
'use client'

import { useState, useTransition, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  updateContactAction,
  syncContactGroupsAction,
  type ContactWithGroups,
  type ContactGroup,
} from '@/app/dashboard/contacts/actions'

interface Props {
  contact: ContactWithGroups | null
  groups: ContactGroup[]
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function EditContactDialog({ contact, groups, onOpenChange, onSaved }: Props) {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', company: '' })
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (contact) {
      setForm({
        full_name: contact.full_name,
        email: contact.email ?? '',
        phone: contact.phone ?? '',
        company: contact.company ?? '',
      })
      setSelectedGroups(contact.groups.map(g => g.id))
    }
  }, [contact])

  function toggleGroup(id: string) {
    setSelectedGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  function save() {
    if (!contact) return
    startTransition(async () => {
      try {
        await updateContactAction(contact.id, form)
        await syncContactGroupsAction(contact.id, selectedGroups)
        toast.success('Contacto atualizado')
        onOpenChange(false)
        onSaved()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      }
    })
  }

  return (
    <Dialog open={!!contact} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Editar Contacto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-zinc-400">Nome *</Label>
            <Input
              value={form.full_name}
              onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-400">Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-400">Telefone</Label>
            <Input
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-400">Empresa</Label>
            <Input
              value={form.company}
              onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
          </div>

          {groups.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-zinc-400">Grupos</Label>
              <div className="flex flex-wrap gap-2">
                {groups.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGroup(g.id)}
                    className="text-xs px-3 py-1 rounded-full border transition-colors"
                    style={
                      selectedGroups.includes(g.id)
                        ? { backgroundColor: (g.color ?? '#6366f1') + '33', color: g.color ?? '#818cf8', borderColor: g.color ?? '#6366f1' }
                        : { backgroundColor: 'transparent', color: '#71717a', borderColor: '#3f3f46' }
                    }
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={save}
            disabled={!form.full_name.trim() || isPending}
            className="w-full"
          >
            {isPending ? 'A guardar...' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/contacts/EditContactDialog.tsx
git commit -m "feat: EditContactDialog with group multi-select sync"
```

---

## Task 8: NewGroupDialog component

**Files:**
- Create: `components/contacts/NewGroupDialog.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/contacts/NewGroupDialog.tsx
'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createGroupAction } from '@/app/dashboard/contacts/actions'

const PRESET_COLORS = [
  { hex: '#6366f1', label: 'Índigo' },
  { hex: '#10b981', label: 'Verde' },
  { hex: '#f59e0b', label: 'Âmbar' },
  { hex: '#ef4444', label: 'Vermelho' },
  { hex: '#8b5cf6', label: 'Violeta' },
  { hex: '#06b6d4', label: 'Ciano' },
  { hex: '#f97316', label: 'Laranja' },
  { hex: '#ec4899', label: 'Rosa' },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  isAdmin: boolean
  onCreated: () => void
}

export function NewGroupDialog({ open, onOpenChange, isAdmin, onCreated }: Props) {
  const [form, setForm] = useState({ name: '', description: '', color: PRESET_COLORS[0].hex, admin_only: false })
  const [isPending, startTransition] = useTransition()

  function reset() {
    setForm({ name: '', description: '', color: PRESET_COLORS[0].hex, admin_only: false })
  }

  function submit() {
    startTransition(async () => {
      try {
        await createGroupAction(form)
        toast.success('Grupo criado')
        reset()
        onOpenChange(false)
        onCreated()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Novo Grupo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-zinc-400">Nome *</Label>
            <Input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
              placeholder="Ex: CTT, Fornecedores..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-400">Descrição</Label>
            <Input
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
              placeholder="Opcional"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-400">Cor</Label>
            <div className="flex gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, color: c.hex }))}
                  title={c.label}
                  className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c.hex,
                    outline: form.color === c.hex ? `2px solid ${c.hex}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, admin_only: !p.admin_only }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.admin_only ? 'bg-amber-500' : 'bg-zinc-700'}`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${form.admin_only ? 'translate-x-4.5' : 'translate-x-0.5'}`}
                />
              </button>
              <Label className="text-zinc-400 cursor-pointer" onClick={() => setForm(p => ({ ...p, admin_only: !p.admin_only }))}>
                Visível apenas a admins
              </Label>
            </div>
          )}

          <Button
            onClick={submit}
            disabled={!form.name.trim() || isPending}
            className="w-full"
          >
            {isPending ? 'A criar...' : 'Criar Grupo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/contacts/NewGroupDialog.tsx
git commit -m "feat: NewGroupDialog with color picker and admin_only toggle"
```

---

## Task 9: GroupsPanel component

**Files:**
- Create: `components/contacts/GroupsPanel.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/contacts/GroupsPanel.tsx
'use client'

import { Plus, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContactGroup } from '@/app/dashboard/contacts/actions'

interface Props {
  groups: ContactGroup[]
  selectedGroupId: string | null
  onSelectGroup: (id: string | null) => void
  totalCount: number
  ungroupedCount: number
  isAdmin: boolean
  onNewGroup: () => void
}

export function GroupsPanel({
  groups,
  selectedGroupId,
  onSelectGroup,
  totalCount,
  ungroupedCount,
  isAdmin,
  onNewGroup,
}: Props) {
  return (
    <div className="w-60 shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Grupos</span>
        <button
          onClick={onNewGroup}
          className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title="Novo grupo"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {/* Todos */}
        <GroupItem
          label="Todos"
          count={totalCount}
          active={selectedGroupId === null}
          onClick={() => onSelectGroup(null)}
          icon={<Users className="w-3.5 h-3.5" />}
        />

        {/* Sem grupo */}
        <GroupItem
          label="Sem grupo"
          count={ungroupedCount}
          active={selectedGroupId === 'none'}
          onClick={() => onSelectGroup('none')}
          muted
        />

        {groups.length > 0 && (
          <div className="pt-2">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider px-2 pb-1">Grupos</p>
            {groups.map(g => (
              <GroupItem
                key={g.id}
                label={g.name}
                count={undefined}
                active={selectedGroupId === g.id}
                onClick={() => onSelectGroup(g.id)}
                color={g.color ?? '#6366f1'}
                adminOnly={g.admin_only}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface GroupItemProps {
  label: string
  count?: number
  active: boolean
  onClick: () => void
  icon?: React.ReactNode
  color?: string
  muted?: boolean
  adminOnly?: boolean
}

function GroupItem({ label, count, active, onClick, icon, color, muted, adminOnly }: GroupItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors text-left',
        active
          ? 'bg-zinc-800 text-zinc-100'
          : muted
            ? 'text-zinc-600 hover:bg-zinc-900 hover:text-zinc-400'
            : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
      )}
    >
      {icon ? (
        <span className="text-zinc-500">{icon}</span>
      ) : color ? (
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      ) : null}

      <span className="flex-1 truncate">{label}</span>

      {adminOnly && (
        <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
          Admin
        </span>
      )}

      {count !== undefined && (
        <span className={cn('text-xs px-1.5 rounded', active ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-900 text-zinc-600')}>
          {count}
        </span>
      )}
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/contacts/GroupsPanel.tsx
git commit -m "feat: GroupsPanel with group list and selection"
```

---

## Task 10: ContactsList component

**Files:**
- Create: `components/contacts/ContactsList.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/contacts/ContactsList.tsx
'use client'

import { useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { ContactCard } from './ContactCard'
import type { ContactWithGroups } from '@/app/dashboard/contacts/actions'

interface Props {
  contacts: ContactWithGroups[]
  onNewContact: () => void
  onEdit: (contact: ContactWithGroups) => void
  onDeactivate: (contactId: string) => void
  disabled?: boolean
}

export function ContactsList({ contacts, onNewContact, onEdit, onDeactivate, disabled }: Props) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? contacts.filter(c => {
        const q = search.toLowerCase()
        return (
          c.full_name.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.includes(q)
        )
      })
    : contacts

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800">
        <h1 className="text-lg font-semibold text-zinc-100 mr-auto">Contactos</h1>
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-500 w-52">
          <Search className="w-3.5 h-3.5 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar..."
            className="bg-transparent outline-none w-full text-zinc-300 placeholder:text-zinc-600"
          />
        </div>
        <button
          onClick={onNewContact}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo contacto
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-zinc-600 text-sm gap-1">
            <Users className="w-8 h-8 mb-1 opacity-40" />
            {search ? 'Nenhum resultado para a pesquisa.' : 'Nenhum contacto neste grupo.'}
          </div>
        ) : (
          filtered.map(c => (
            <ContactCard
              key={c.id}
              contact={c}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
              disabled={disabled}
            />
          ))
        )}
      </div>
    </div>
  )
}

// Fix missing import
import { Users } from 'lucide-react'
```

- [ ] **Step 2: Fix duplicate import**

The `Users` import above is duplicated for clarity in the snippet. The actual file should have a single import block at the top:

```tsx
import { useState } from 'react'
import { Search, Plus, Users } from 'lucide-react'
import { ContactCard } from './ContactCard'
import type { ContactWithGroups } from '@/app/dashboard/contacts/actions'
```

Remove the bottom `import { Users }` line.

- [ ] **Step 3: Commit**

```bash
git add components/contacts/ContactsList.tsx
git commit -m "feat: ContactsList with search filter"
```

---

## Task 11: ContactsLayout (state orchestrator)

**Files:**
- Create: `components/contacts/ContactsLayout.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/contacts/ContactsLayout.tsx
'use client'

import { useState, useTransition, useCallback } from 'react'
import { toast } from 'sonner'
import { GroupsPanel } from './GroupsPanel'
import { ContactsList } from './ContactsList'
import { NewContactDialog } from './NewContactDialog'
import { EditContactDialog } from './EditContactDialog'
import { NewGroupDialog } from './NewGroupDialog'
import {
  loadContactsAction,
  loadGroupsAction,
  deactivateContactAction,
  type ContactGroup,
  type ContactWithGroups,
} from '@/app/dashboard/contacts/actions'

interface Props {
  initialContacts: ContactWithGroups[]
  initialGroups: ContactGroup[]
  isAdmin: boolean
}

export function ContactsLayout({ initialContacts, initialGroups, isAdmin }: Props) {
  const [contacts, setContacts] = useState(initialContacts)
  const [groups, setGroups] = useState(initialGroups)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [editingContact, setEditingContact] = useState<ContactWithGroups | null>(null)
  const [showNewContact, setShowNewContact] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [isPending, startTransition] = useTransition()

  const reloadContacts = useCallback(() => {
    startTransition(async () => {
      try {
        const [newContacts, newGroups] = await Promise.all([
          loadContactsAction(selectedGroupId),
          loadGroupsAction(),
        ])
        setContacts(newContacts)
        setGroups(newGroups)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao carregar')
      }
    })
  }, [selectedGroupId])

  async function handleSelectGroup(id: string | null) {
    setSelectedGroupId(id)
    startTransition(async () => {
      try {
        setContacts(await loadContactsAction(id))
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao filtrar')
      }
    })
  }

  function handleDeactivate(contactId: string) {
    if (!confirm('Desativar este contacto? Será removido do directório.')) return
    startTransition(async () => {
      try {
        await deactivateContactAction(contactId)
        toast.success('Contacto desativado')
        reloadContacts()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      }
    })
  }

  const ungroupedCount = contacts.filter(c => c.groups.length === 0).length

  return (
    <div className="flex h-full">
      <GroupsPanel
        groups={groups}
        selectedGroupId={selectedGroupId}
        onSelectGroup={handleSelectGroup}
        totalCount={contacts.length}
        ungroupedCount={ungroupedCount}
        isAdmin={isAdmin}
        onNewGroup={() => setShowNewGroup(true)}
      />

      <ContactsList
        contacts={contacts}
        onNewContact={() => setShowNewContact(true)}
        onEdit={setEditingContact}
        onDeactivate={handleDeactivate}
        disabled={isPending}
      />

      <NewContactDialog
        open={showNewContact}
        onOpenChange={setShowNewContact}
        groups={groups}
        onCreated={reloadContacts}
      />

      <EditContactDialog
        contact={editingContact}
        groups={groups}
        onOpenChange={open => { if (!open) setEditingContact(null) }}
        onSaved={reloadContacts}
      />

      <NewGroupDialog
        open={showNewGroup}
        onOpenChange={setShowNewGroup}
        isAdmin={isAdmin}
        onCreated={reloadContacts}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/contacts/ContactsLayout.tsx
git commit -m "feat: ContactsLayout state orchestrator"
```

---

## Task 12: Page route

**Files:**
- Create: `app/dashboard/contacts/page.tsx`

- [ ] **Step 1: Create page**

```tsx
// app/dashboard/contacts/page.tsx
import { createClient } from '@/lib/supabase/server'
import { resolveOrgMember } from '@/lib/supabase/actions'
import { redirect } from 'next/navigation'
import { ContactsLayout } from '@/components/contacts/ContactsLayout'
import { loadContactsAction, loadGroupsAction } from './actions'

export default async function ContactsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) redirect('/auth/login')

  const isAdmin = member.role === 'admin'

  const [contacts, groups] = await Promise.all([
    loadContactsAction(null),
    loadGroupsAction(),
  ])

  return (
    <div className="h-full flex flex-col">
      <ContactsLayout
        initialContacts={contacts}
        initialGroups={groups}
        isAdmin={isAdmin}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify old clients page still exists**

The old `app/dashboard/clients/` folder stays. The redirect in `next.config.ts` handles the URL change. Do not delete the old folder yet — verify the redirect works first.

- [ ] **Step 3: Start dev server and test**

```bash
npm run dev
```

Visit `http://localhost:3000/dashboard/contacts`.

Verify:
- Two-column layout renders
- Groups panel shows "Todos" and "Sem grupo"
- "Novo contacto" button opens dialog
- "+" button in groups panel opens NewGroupDialog
- Creating a contact shows it in the list
- Creating a group shows it in the left panel

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/contacts/page.tsx
git commit -m "feat: contacts page with two-column layout"
```

---

## Task 13: Remove old clients page

- [ ] **Step 1: Verify redirect is working**

Visit `http://localhost:3000/dashboard/clients` — should redirect to `/dashboard/contacts`.

- [ ] **Step 2: Delete old page**

```bash
rm -rf app/dashboard/clients
```

- [ ] **Step 3: Verify no broken imports**

```bash
npx tsc --noEmit
```
Expected: no errors referencing `app/dashboard/clients`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old clients page (replaced by contacts)"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Rename "Clientes" to "Contactos" | Task 3 (sidebar), Task 12 (page) |
| Create contacts | Task 6 (dialog), Task 4 (action) |
| Contact groups entity | Task 1 (DB), Task 4 (actions) |
| Contact in multiple groups | Task 1 (junction table UNIQUE constraint allows many) |
| Group visibility (admin_only) | Task 2 (resolveOrgMember role), Task 4 (filter) |
| Members cannot see admin groups | Task 4 (loadGroupsAction filter) |
| Contacts exclusive to admin groups hidden from members | Task 4 (loadContactsAction + isContactVisibleToMember) |
| Two-column layout | Task 9 (GroupsPanel), Task 10 (ContactsList), Task 11 (ContactsLayout) |
| Contact without group | Shown as "Sem grupo" tag in ContactCard, filterable in GroupsPanel |
| Create group with color | Task 8 (NewGroupDialog preset colors) |
| 301 redirect /clients -> /contacts | Task 3 (next.config.ts) |
| Group delete | Task 4 (deleteGroupAction) — admin only |
| Edit contact + groups | Task 7 (EditContactDialog + syncContactGroupsAction) |

**No placeholders found.**

**Type consistency:** `ContactWithGroups`, `ContactGroup` defined in `actions.ts` Task 4, used consistently in Tasks 5-12. `isContactVisibleToMember` defined Task 2, used Task 4. `syncContactGroupsAction` defined Task 4, used Task 7.
