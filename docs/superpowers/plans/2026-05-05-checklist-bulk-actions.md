# Checklist Bulk Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Selecionar múltiplos items do checklist e alterar o status de todos de uma vez.

**Architecture:** `ChecklistBoard` ganha estado de seleção `Set<string>`. Toolbar sticky aparece quando há seleção. Novo server action `bulkUpdateChecklistStatusAction` em actions.ts faz update em batch e dispara notificações para os concluídos via API PATCH existente.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind, Supabase

---

## Ficheiros

| Ficheiro | Tipo |
|---|---|
| `app/dashboard/events/[eventId]/checklist/actions.ts` | Criar — `bulkUpdateChecklistStatusAction` |
| `components/events/ChecklistBoard.tsx` | Modificar — checkboxes + toolbar |

---

### Task 1: Server action `bulkUpdateChecklistStatusAction`

**Files:**
- Create: `app/dashboard/events/[eventId]/checklist/actions.ts`
- Test: `__tests__/checklist-bulk-actions.test.ts`

- [ ] **Step 1: Escrever teste falhante**

```typescript
// __tests__/checklist-bulk-actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpdate = vi.fn()
const mockFetch = vi.fn()

function makeQuery(result: unknown) {
  const q: Record<string, unknown> = {}
  q.then = (res: (v: unknown) => void) => Promise.resolve(result).then(res)
  const chain = () => makeQuery(result)
  q.select = vi.fn(chain)
  q.eq = vi.fn(chain)
  q.in = vi.fn(chain)
  q.single = vi.fn(chain)
  q.update = vi.fn((...args: unknown[]) => { mockUpdate(...args); return makeQuery(result) })
  return q
}

let fromResults: unknown[] = []
const supabaseMock = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => {
    const result = fromResults.shift() ?? { data: null, error: null }
    return makeQuery(result)
  }),
}

vi.mock('@/lib/supabase/server', () => ({ createClient: () => Promise.resolve(supabaseMock) }))
vi.mock('@/lib/supabase/actions', () => ({ resolveOrgMember: vi.fn() }))

global.fetch = mockFetch as unknown as typeof fetch

describe('bulkUpdateChecklistStatusAction', () => {
  let bulkUpdateChecklistStatusAction: (eventId: string, ids: string[], status: string) => Promise<void>
  let resolveOrgMember: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    fromResults = []
    mockUpdate.mockReset()
    mockFetch.mockReset()
    supabaseMock.auth.getUser.mockReset()
    supabaseMock.from.mockClear()

    const mod = await import('@/app/dashboard/events/[eventId]/checklist/actions')
    bulkUpdateChecklistStatusAction = mod.bulkUpdateChecklistStatusAction

    const helpers = await import('@/lib/supabase/actions')
    resolveOrgMember = helpers.resolveOrgMember as ReturnType<typeof vi.fn>
    resolveOrgMember.mockReset()
  })

  it('throws when not authenticated', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } })
    await expect(bulkUpdateChecklistStatusAction('e1', ['i1'], 'completed')).rejects.toThrow('Não autenticado')
  })

  it('throws when not org member', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue(null)
    await expect(bulkUpdateChecklistStatusAction('e1', ['i1'], 'completed')).rejects.toThrow('Não autorizado')
  })

  it('throws when event not owned', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue({ organization_id: 'org1' })
    fromResults = [{ data: null, error: null }]
    await expect(bulkUpdateChecklistStatusAction('e1', ['i1'], 'completed')).rejects.toThrow('Evento não encontrado')
  })

  it('throws when ids array is empty', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue({ organization_id: 'org1' })
    await expect(bulkUpdateChecklistStatusAction('e1', [], 'completed')).rejects.toThrow('Nenhum item selecionado')
  })

  it('calls update with correct status for valid request', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue({ organization_id: 'org1' })
    fromResults = [
      { data: { id: 'e1' }, error: null }, // event ownership check
      { data: null, error: null },           // bulk update
    ]
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ item: {} }) })
    await bulkUpdateChecklistStatusAction('e1', ['i1', 'i2'], 'in_progress')
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'in_progress' }))
  })
})
```

- [ ] **Step 2: Correr teste para confirmar que falha**

```bash
npx vitest run __tests__/checklist-bulk-actions.test.ts
```

Expected: FAIL com "Cannot find module"

- [ ] **Step 3: Criar `app/dashboard/events/[eventId]/checklist/actions.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { resolveOrgMember } from '@/lib/supabase/actions'
import type { ChecklistItemStatus } from '@/types/app'

async function assertEventOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  organizationId: string
) {
  const { data } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('organization_id', organizationId)
    .single()
  return !!data
}

export async function bulkUpdateChecklistStatusAction(
  eventId: string,
  ids: string[],
  status: ChecklistItemStatus
) {
  if (!ids.length) throw new Error('Nenhum item selecionado')
  if (ids.length > 50) throw new Error('Máximo 50 items por operação')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) throw new Error('Evento não encontrado')

  const updateData: Record<string, unknown> = { status }
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString()
  } else {
    updateData.completed_at = null
  }

  const { error } = await supabase
    .from('event_checklist_items')
    .update(updateData)
    .in('id', ids)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)

  // Dispatch notifications for completed items via existing API route
  if (status === 'completed') {
    await Promise.allSettled(
      ids.map(id =>
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/events/${eventId}/checklist-items/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed', _notifyOnly: true }),
        })
      )
    )
  }
}
```

- [ ] **Step 4: Correr testes**

```bash
npx vitest run __tests__/checklist-bulk-actions.test.ts
```

Expected: PASS (5 testes)

- [ ] **Step 5: Commit**

```bash
git add "app/dashboard/events/[eventId]/checklist/actions.ts" __tests__/checklist-bulk-actions.test.ts
git commit -m "feat: bulkUpdateChecklistStatusAction with tests"
```

---

### Task 2: Checkboxes e toolbar no `ChecklistBoard`

**Files:**
- Modify: `components/events/ChecklistBoard.tsx`

- [ ] **Step 1: Adicionar estado de seleção ao `ChecklistBoard`**

No topo da função `ChecklistBoard`, após os estados existentes, adicionar:

```typescript
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearSelection() {
    setSelected(new Set())
  }

  async function bulkUpdate(status: 'completed' | 'in_progress' | 'skipped') {
    if (!selected.size) return
    setBulkLoading(true)
    try {
      const { bulkUpdateChecklistStatusAction } = await import(
        '@/app/dashboard/events/[eventId]/checklist/actions'
      )
      await bulkUpdateChecklistStatusAction(eventId, Array.from(selected), status)
      setItems(prev => prev.map(i =>
        selected.has(i.id)
          ? { ...i, status, completed_at: status === 'completed' ? new Date().toISOString() : null }
          : i
      ))
      clearSelection()
      toast.success(`${selected.size} etapa${selected.size !== 1 ? 's' : ''} atualizadas`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setBulkLoading(false)
    }
  }
```

- [ ] **Step 2: Adicionar toolbar de seleção**

No JSX do `ChecklistBoard`, antes de `{/* Items */}`, adicionar:

```tsx
      {/* Bulk toolbar */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex items-center gap-2 mb-3 p-3 bg-slate-900 text-white rounded-xl shadow-lg">
          <span className="text-sm font-medium flex-1">
            {selected.size} selecionado{selected.size !== 1 ? 's' : ''}
          </span>
          <Button size="sm" disabled={bulkLoading}
            className="h-7 px-3 text-xs bg-green-600 hover:bg-green-500 text-white border-0"
            onClick={() => bulkUpdate('completed')}>
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Concluído
          </Button>
          <Button size="sm" disabled={bulkLoading}
            className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-500 text-white border-0"
            onClick={() => bulkUpdate('in_progress')}>
            Em Progresso
          </Button>
          <Button size="sm" disabled={bulkLoading}
            className="h-7 px-3 text-xs bg-slate-600 hover:bg-slate-500 text-white border-0"
            onClick={() => bulkUpdate('skipped')}>
            <SkipForward className="w-3.5 h-3.5 mr-1" />Saltar
          </Button>
          <Button size="sm" variant="ghost" disabled={bulkLoading}
            className="h-7 px-2 text-white/60 hover:text-white hover:bg-slate-700"
            onClick={clearSelection}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
```

- [ ] **Step 3: Adicionar checkbox a cada item**

Na função `ChecklistBoard`, mudar o `.map(item => ...)` para passar `isSelected` e `onToggleSelect` ao `ChecklistItem`:

```tsx
        {items.map(item =>
          editingId === item.id ? (
            <EditRow
              key={item.id}
              item={item}
              onSave={edits => saveEdit(item.id, edits)}
              onCancel={() => setEditingId(null)}
              isLoading={loadingId === item.id}
            />
          ) : (
            <ChecklistItem
              key={item.id}
              item={item}
              isLoading={loadingId === item.id}
              isSelected={selected.has(item.id)}
              onToggleSelect={() => toggleSelect(item.id)}
              onComplete={() => updateStatus(item.id, 'completed')}
              onStart={() => updateStatus(item.id, 'in_progress')}
              onSkip={() => updateStatus(item.id, 'skipped')}
              onReset={() => updateStatus(item.id, 'pending')}
              onEdit={() => setEditingId(item.id)}
              onDelete={() => deleteItem(item.id)}
            />
          )
        )}
```

- [ ] **Step 4: Adicionar `isSelected` e `onToggleSelect` à interface e ao render do `ChecklistItem`**

Atualizar `ChecklistItemProps`:

```typescript
interface ChecklistItemProps {
  item: ItemWithMember
  isLoading: boolean
  isSelected: boolean
  onToggleSelect: () => void
  onComplete: () => void
  onStart: () => void
  onSkip: () => void
  onReset: () => void
  onEdit: () => void
  onDelete: () => void
}
```

Atualizar a assinatura da função:

```typescript
function ChecklistItem({ item, isLoading, isSelected, onToggleSelect, onComplete, onStart, onSkip, onReset, onEdit, onDelete }: ChecklistItemProps) {
```

Adicionar checkbox no início do `div` principal do `ChecklistItem`, antes do "Status icon":

```tsx
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
        className="w-4 h-4 rounded border-slate-300 text-slate-700 cursor-pointer shrink-0 opacity-0 group-hover:opacity-100 transition-opacity checked:opacity-100"
        onClick={e => e.stopPropagation()}
      />
```

- [ ] **Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros

- [ ] **Step 6: Commit e push**

```bash
git add components/events/ChecklistBoard.tsx
git commit -m "feat: bulk selection and actions in ChecklistBoard"
git push origin master
```
