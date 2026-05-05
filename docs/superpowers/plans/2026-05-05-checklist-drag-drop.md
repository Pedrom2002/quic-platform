# Checklist Drag & Drop Reordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir reordenar itens do checklist via drag & drop, persistindo a nova ordem na base de dados via campo `position`.

**Architecture:** `@dnd-kit/sortable` envolve a lista em `ChecklistBoard`. Cada item tem um drag handle. Ao soltar, a lista reordena otimisticamente e `reorderChecklistItemsAction` persiste as novas posições em batch. Em caso de erro, reverte para a ordem anterior.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind, `@dnd-kit/core`, `@dnd-kit/sortable`, Supabase

---

## Ficheiros

| Ficheiro | Tipo |
|---|---|
| `app/dashboard/events/[eventId]/checklist/actions.ts` | Modificar — adicionar `reorderChecklistItemsAction` |
| `components/events/ChecklistBoard.tsx` | Modificar — DndContext, SortableContext, drag handles, handleDragEnd |

---

### Task 1: Server action `reorderChecklistItemsAction`

**Files:**
- Modify: `app/dashboard/events/[eventId]/checklist/actions.ts`
- Test: `__tests__/checklist-reorder.test.ts`

- [ ] **Step 1: Escrever teste falhante**

```typescript
// __tests__/checklist-reorder.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpdate = vi.fn()

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

describe('reorderChecklistItemsAction', () => {
  let reorderChecklistItemsAction: (eventId: string, orderedIds: string[]) => Promise<void>
  let resolveOrgMember: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    fromResults = []
    mockUpdate.mockReset()
    supabaseMock.auth.getUser.mockReset()
    supabaseMock.from.mockClear()

    const mod = await import('@/app/dashboard/events/[eventId]/checklist/actions')
    reorderChecklistItemsAction = mod.reorderChecklistItemsAction

    const helpers = await import('@/lib/supabase/actions')
    resolveOrgMember = helpers.resolveOrgMember as ReturnType<typeof vi.fn>
    resolveOrgMember.mockReset()
  })

  it('throws when not authenticated', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } })
    await expect(reorderChecklistItemsAction('e1', ['i1'])).rejects.toThrow('Não autenticado')
  })

  it('throws when not org member', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue(null)
    await expect(reorderChecklistItemsAction('e1', ['i1'])).rejects.toThrow('Não autorizado')
  })

  it('throws when orderedIds is empty', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue({ organization_id: 'org1' })
    await expect(reorderChecklistItemsAction('e1', [])).rejects.toThrow('Nenhum item')
  })

  it('throws when orderedIds exceeds 200', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue({ organization_id: 'org1' })
    const ids = Array.from({ length: 201 }, (_, i) => `id${i}`)
    await expect(reorderChecklistItemsAction('e1', ids)).rejects.toThrow('Máximo')
  })

  it('throws when event not owned', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue({ organization_id: 'org1' })
    fromResults = [{ data: null, error: null }]
    await expect(reorderChecklistItemsAction('e1', ['i1'])).rejects.toThrow('Evento não encontrado')
  })

  it('calls update with correct position for each id', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue({ organization_id: 'org1' })
    fromResults = [
      { data: { id: 'e1' }, error: null }, // event ownership check
      { data: null, error: null },           // update id1
      { data: null, error: null },           // update id2
    ]
    await reorderChecklistItemsAction('e1', ['id1', 'id2'])
    expect(mockUpdate).toHaveBeenCalledWith({ position: 10 })
    expect(mockUpdate).toHaveBeenCalledWith({ position: 20 })
  })
})
```

- [ ] **Step 2: Correr teste para confirmar que falha**

```bash
npx vitest run __tests__/checklist-reorder.test.ts
```

Expected: FAIL com "reorderChecklistItemsAction is not a function" ou similar

- [ ] **Step 3: Adicionar `reorderChecklistItemsAction` a `app/dashboard/events/[eventId]/checklist/actions.ts`**

Adicionar no final do ficheiro existente (não substituir o conteúdo):

```typescript
export async function reorderChecklistItemsAction(
  eventId: string,
  orderedIds: string[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  if (!orderedIds.length) throw new Error('Nenhum item para reordenar')
  if (orderedIds.length > 200) throw new Error('Máximo 200 items por operação')

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) throw new Error('Evento não encontrado')

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from('event_checklist_items')
        .update({ position: (index + 1) * 10 })
        .eq('id', id)
        .eq('event_id', eventId)
    )
  )
}
```

- [ ] **Step 4: Correr testes para confirmar que passam**

```bash
npx vitest run __tests__/checklist-reorder.test.ts
```

Expected: PASS (6 testes)

- [ ] **Step 5: Commit**

```bash
git add "app/dashboard/events/[eventId]/checklist/actions.ts" __tests__/checklist-reorder.test.ts
git commit -m "feat: reorderChecklistItemsAction with tests"
```

---

### Task 2: Drag & drop no `ChecklistBoard`

**Files:**
- Modify: `components/events/ChecklistBoard.tsx`

- [ ] **Step 1: Instalar dependências**

```bash
npm install @dnd-kit/core @dnd-kit/sortable
```

Expected: `package.json` actualizado com `@dnd-kit/core` e `@dnd-kit/sortable`

- [ ] **Step 2: Adicionar imports ao `ChecklistBoard.tsx`**

No topo do ficheiro, após os imports existentes, adicionar:

```typescript
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
```

Adicionar `GripVertical` ao import existente do lucide-react (ou mantê-lo separado — qualquer dos dois funciona).

- [ ] **Step 3: Adicionar sensores e `handleDragEnd` ao `ChecklistBoard`**

Dentro da função `ChecklistBoard`, após os estados existentes (`selected`, `bulkLoading`), adicionar:

```typescript
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const previousItems = items
    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex = items.findIndex(i => i.id === over.id)
    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered)

    try {
      const { reorderChecklistItemsAction } = await import(
        '@/app/dashboard/events/[eventId]/checklist/actions'
      )
      await reorderChecklistItemsAction(eventId, reordered.map(i => i.id))
    } catch (err: unknown) {
      setItems(previousItems)
      toast.error(err instanceof Error ? err.message : 'Erro ao reordenar')
    }
  }
```

- [ ] **Step 4: Envolver a lista de items com `DndContext` e `SortableContext`**

No JSX, substituir:

```tsx
      {/* Items */}
      <div className="space-y-2 mb-4">
        {items.map(item =>
```

por:

```tsx
      {/* Items */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 mb-4">
            {items.map(item =>
```

E fechar os dois novos elementos após o `</div>` do `space-y-2`:

```tsx
          </div>
        </SortableContext>
      </DndContext>
```

O bloco completo fica:

```tsx
      {/* Items */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 mb-4">
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
            {!items.length && (
              <p className="text-slate-400 text-sm text-center py-8">Nenhuma etapa adicionada ainda.</p>
            )}
          </div>
        </SortableContext>
      </DndContext>
```

- [ ] **Step 5: Adicionar `dragHandleProps` à `ChecklistItemProps` e ao `ChecklistItem`**

Atualizar a interface `ChecklistItemProps` — adicionar dois novos campos:

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
  dragHandleProps: {
    ref: (node: HTMLElement | null) => void
    style: React.CSSProperties
    isDragging: boolean
    listeners: Record<string, unknown> | undefined
    attributes: Record<string, unknown>
  }
}
```

Atualizar a assinatura da função `ChecklistItem`:

```typescript
function ChecklistItem({ item, isLoading, isSelected, onToggleSelect, onComplete, onStart, onSkip, onReset, onEdit, onDelete, dragHandleProps }: ChecklistItemProps) {
```

- [ ] **Step 6: Usar `useSortable` dentro de `ChecklistItem` e adicionar drag handle**

Substituir a função `ChecklistItem` inteira pela versão com `useSortable`. A diferença em relação à versão actual:

1. `useSortable` chamado no topo da função
2. O `div` raiz do item recebe `ref`, `style` e classes de drag
3. Drag handle adicionado antes do checkbox

```typescript
function ChecklistItem({ item, isLoading, isSelected, onToggleSelect, onComplete, onStart, onSkip, onReset, onEdit, onDelete, dragHandleProps }: ChecklistItemProps) {
  const isCompleted = item.status === 'completed'
  const isSkipped = item.status === 'skipped'
  const isInProgress = item.status === 'in_progress'
  const isPending = item.status === 'pending'
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      ref={dragHandleProps.ref}
      style={dragHandleProps.style}
      className={cn(
        'flex items-center gap-3 p-4 rounded-xl border transition-all group',
        dragHandleProps.isDragging ? 'opacity-50 shadow-lg' : '',
        isCompleted ? 'bg-green-50 border-green-200'
          : isSkipped ? 'bg-slate-50 border-slate-200 opacity-60'
          : isInProgress ? 'bg-blue-50 border-blue-200'
          : 'bg-white border-slate-200 hover:border-slate-300'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Drag handle */}
      <button
        {...(dragHandleProps.listeners as React.HTMLAttributes<HTMLButtonElement>)}
        {...(dragHandleProps.attributes as React.HTMLAttributes<HTMLButtonElement>)}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 touch-none"
        onClick={e => e.stopPropagation()}
        aria-label="Reordenar"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
        className="w-4 h-4 rounded border-slate-300 text-slate-700 cursor-pointer shrink-0 opacity-0 group-hover:opacity-100 transition-opacity checked:opacity-100"
        onClick={e => e.stopPropagation()}
      />

      {/* Status icon */}
      <button onClick={isCompleted || isSkipped ? onReset : onComplete} disabled={isLoading} className="shrink-0">
        {isLoading ? <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
          : isCompleted ? <CheckCircle2 className="w-5 h-5 text-green-500" />
          : isSkipped ? <SkipForward className="w-5 h-5 text-slate-400" />
          : <Circle className={cn('w-5 h-5 transition-colors', isInProgress ? 'text-blue-400' : 'text-slate-300 hover:text-slate-500')} />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn('text-sm font-medium', isCompleted ? 'text-slate-400 line-through' : 'text-slate-800')}>
            {item.title}
          </p>
          {item.client_label && item.client_label !== item.title && (
            <span className="text-xs text-slate-400">({item.client_label})</span>
          )}
          {!item.is_client_visible && <EyeOff className="w-3 h-3 text-slate-300 shrink-0" />}
        </div>
        {isCompleted && item.completed_at && (
          <p className="text-xs text-slate-400 mt-0.5">
            Concluído {format(new Date(item.completed_at), "d MMM · HH'h'mm", { locale: pt })}
            {item.completion_note && ` · ${item.completion_note}`}
          </p>
        )}
        {isInProgress && <p className="text-xs text-blue-500 mt-0.5">Em progresso</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {!isCompleted && !isSkipped && (
          <>
            {isPending && (
              <Button size="sm" variant="ghost" onClick={onStart} disabled={isLoading}
                className="text-xs text-slate-400 hover:text-slate-700 h-7 px-2">Iniciar</Button>
            )}
            <Button size="sm" onClick={onComplete} disabled={isLoading}
              className={cn('h-7 px-3 text-xs', isInProgress && 'bg-green-600 hover:bg-green-500 text-white')}>
              Concluir
            </Button>
            <Button size="sm" variant="ghost" onClick={onSkip} disabled={isLoading}
              className="text-xs text-slate-400 hover:text-slate-700 h-7 px-2">Ignorar</Button>
          </>
        )}
        {(isCompleted || isSkipped) && (
          <Button size="sm" variant="ghost" onClick={onReset} disabled={isLoading}
            className="text-xs text-slate-400 hover:text-slate-700 h-7 px-2">Repor</Button>
        )}
        <div className={cn('flex items-center gap-0.5 transition-opacity', showActions ? 'opacity-100' : 'opacity-0')}>
          <Button size="sm" variant="ghost" onClick={onEdit} disabled={isLoading}
            className="h-7 w-7 p-0 text-slate-300 hover:text-slate-700">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} disabled={isLoading}
            className="h-7 w-7 p-0 text-slate-300 hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Criar wrapper `SortableChecklistItem` que usa `useSortable` e passa `dragHandleProps`**

O `ChecklistItem` não pode chamar `useSortable` directamente porque o `EditRow` não precisa. Criar um wrapper no mesmo ficheiro, antes do `// ─── Checklist Item ───` section:

```typescript
// ─── Sortable wrapper ─────────────────────────────────────────────────────────

function SortableChecklistItem(props: Omit<ChecklistItemProps, 'dragHandleProps'>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.item.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <ChecklistItem
      {...props}
      dragHandleProps={{
        ref: setNodeRef,
        style,
        isDragging,
        listeners,
        attributes,
      }}
    />
  )
}
```

- [ ] **Step 8: Substituir `<ChecklistItem>` por `<SortableChecklistItem>` no map**

No bloco do `.map(item => ...)` do passo 4, substituir `<ChecklistItem` por `<SortableChecklistItem` e remover o prop `dragHandleProps` do render directo (o wrapper injeta-o):

```tsx
              ) : (
                <SortableChecklistItem
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
```

- [ ] **Step 9: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros. Se houver erros de tipo nos `listeners`/`attributes` (são `SyntheticListenerMap | undefined` e `DraggableAttributes`), ajustar o tipo de `dragHandleProps` em `ChecklistItemProps` para:

```typescript
  dragHandleProps: {
    ref: (node: HTMLElement | null) => void
    style: React.CSSProperties
    isDragging: boolean
    listeners: import('@dnd-kit/core').SyntheticListenerMap | undefined
    attributes: import('@dnd-kit/core').DraggableAttributes
  }
```

- [ ] **Step 10: Commit e push**

```bash
git add components/events/ChecklistBoard.tsx package.json package-lock.json
git commit -m "feat: drag and drop reordering in ChecklistBoard"
git push origin master
```
