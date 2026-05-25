# Checklist Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `category` field to checklist items, display them as horizontal tabs, seed 34 pre-defined tasks across 6 categories into an event, and sync those categories to the event's template.

**Architecture:** Add nullable `category text` column to `event_checklist_items` and `checklist_template_items` via migration. Update `database.ts` types manually. Modify `ChecklistBoard` to group items by category and render `<Tabs>`. Add two server actions (`seedChecklistTasksAction`, `syncCategoriesToTemplateAction`) in the existing checklist actions file.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL), TypeScript, shadcn/ui Tabs, @dnd-kit

---

## File Map

| File | Change |
|------|--------|
| `supabase/migrations/0013_checklist_category.sql` | CREATE — adds `category` column to both tables |
| `types/database.ts` | MODIFY — add `category` field to Row/Insert/Update for both tables |
| `types/app.ts` | MODIFY — add `category` to `ItemWithMemberAndCounts` (via `EventChecklistItem`) |
| `app/dashboard/events/[eventId]/checklist/actions.ts` | MODIFY — add `seedChecklistTasksAction`, `syncCategoriesToTemplateAction` |
| `schemas/checklist.schema.ts` | MODIFY — add `category` to `updateChecklistItemSchema` and `createChecklistItemSchema` |
| `components/events/ChecklistBoard.tsx` | MODIFY — add tabs UI, seed button, category grouping |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/0013_checklist_category.sql`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/0013_checklist_category.sql
ALTER TABLE event_checklist_items
  ADD COLUMN category text;

ALTER TABLE checklist_template_items
  ADD COLUMN category text;
```

- [ ] **Step 2: Apply migration**

```bash
npx supabase db push
```

Expected: `Applied 1 migration` (or similar success). No errors about missing tables.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0013_checklist_category.sql
git commit -m "feat(db): add category column to checklist items (migration 0013)"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `types/database.ts`

The `database.ts` file is auto-generated but must be updated manually to reflect the new column until `supabase gen types` is re-run.

- [ ] **Step 1: Add `category` to `event_checklist_items` Row**

In `types/database.ts`, find the `event_checklist_items` `Row` block (around line 392). Add `category: string | null` after `updated_at`:

```typescript
// Row block — add after `updated_at: string`
category: string | null
```

- [ ] **Step 2: Add `category` to `event_checklist_items` Insert**

In the `Insert` block (around line 413), add:

```typescript
// Insert block — add after `updated_at?: string`
category?: string | null
```

- [ ] **Step 3: Add `category` to `event_checklist_items` Update**

In the `Update` block (around line 434), add:

```typescript
// Update block — add after `updated_at?: string`
category?: string | null
```

- [ ] **Step 4: Add `category` to `checklist_template_items` Row**

Find the `checklist_template_items` `Row` block (around line 149). Add after `updated_at`:

```typescript
// Row block — add after `updated_at: string`
category: string | null
```

- [ ] **Step 5: Add `category` to `checklist_template_items` Insert**

In the `Insert` block, add:

```typescript
// Insert block — add after existing optional fields
category?: string | null
```

- [ ] **Step 6: Add `category` to `checklist_template_items` Update**

In the `Update` block, add:

```typescript
// Update block — add after existing optional fields
category?: string | null
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors. If errors about `category` missing in Pick/Omit elsewhere, add it to those types too.

- [ ] **Step 8: Commit**

```bash
git add types/database.ts
git commit -m "feat(types): add category field to checklist item types"
```

---

## Task 3: Update Zod Schema

**Files:**
- Modify: `schemas/checklist.schema.ts`

The schema is used by the POST route when creating items via the API. Seeds go through server actions (bypass schema), but future items added via the UI form should support category.

- [ ] **Step 1: Add `category` to both schemas**

Replace the file content:

```typescript
import { z } from 'zod'

export const updateChecklistItemSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped']).optional(),
  title: z.string().min(1).optional(),
  client_label: z.string().max(200).nullable().optional(),
  description: z.string().optional(),
  is_client_visible: z.boolean().optional(),
  completion_note: z.string().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  due_at: z.string().datetime().nullable().optional(),
  position: z.number().int().positive().optional(),
  category: z.string().max(100).nullable().optional(),
})

export const createChecklistItemSchema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  client_label: z.string().max(200).nullable().optional(),
  description: z.string().optional(),
  is_client_visible: z.boolean().default(true),
  assigned_to: z.string().uuid().nullable().optional(),
  position: z.number().int().positive(),
  category: z.string().max(100).nullable().optional(),
})

export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>
export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add schemas/checklist.schema.ts
git commit -m "feat(schema): add category to checklist item schemas"
```

---

## Task 4: Server Actions — Seed + Sync

**Files:**
- Modify: `app/dashboard/events/[eventId]/checklist/actions.ts`

- [ ] **Step 1: Add the seed data constant and two actions**

At the end of `app/dashboard/events/[eventId]/checklist/actions.ts`, append:

```typescript
// ---------------------------------------------------------------------------
// SEED DATA
// ---------------------------------------------------------------------------

const SEED_ITEMS: { title: string; category: string }[] = [
  // Estruturas em Falta
  { title: 'Painel de luz para a zona dos camarins', category: 'Estruturas em Falta' },
  { title: 'Ligações elétricas para todas as estruturas, cablagem geral', category: 'Estruturas em Falta' },
  { title: '16 piquetes com disponibilidade para manutenção 24 horas', category: 'Estruturas em Falta' },
  { title: 'Photo Booth', category: 'Estruturas em Falta' },
  { title: 'Tenda logística 2m x 2m', category: 'Estruturas em Falta' },
  { title: 'Palco 10m x 10m', category: 'Estruturas em Falta' },
  { title: 'Régies cobertas 3m x 3m', category: 'Estruturas em Falta' },
  // Sistema de Som
  { title: 'Line-array 8 topos por lado + subgrave 1 por lado', category: 'Sistema de Som' },
  { title: 'Mesa de mistura de palco independente stage 1', category: 'Sistema de Som' },
  { title: 'Mesa de mistura de palco independente stage 2', category: 'Sistema de Som' },
  { title: 'Monitores — até 8 unidades por stage', category: 'Sistema de Som' },
  { title: '2 side-fills por lado', category: 'Sistema de Som' },
  { title: '8 canais in-ear', category: 'Sistema de Som' },
  { title: 'Microfonia adequada', category: 'Sistema de Som' },
  { title: 'Cablagem e acessórios de som', category: 'Sistema de Som' },
  // Sistema de Iluminação
  { title: '8 projetores Spot One', category: 'Sistema de Iluminação' },
  { title: '8 Wash LED', category: 'Sistema de Iluminação' },
  { title: '4 Beam', category: 'Sistema de Iluminação' },
  { title: '6 Strobes', category: 'Sistema de Iluminação' },
  { title: '1 máquina de fumo/haze', category: 'Sistema de Iluminação' },
  { title: '4 blinders de 4 unidades', category: 'Sistema de Iluminação' },
  { title: '4 blinders de 2 unidades', category: 'Sistema de Iluminação' },
  { title: '2 varas de Par 56 para frente de palco', category: 'Sistema de Iluminação' },
  { title: 'Mesa de controlo de iluminação', category: 'Sistema de Iluminação' },
  { title: 'Followspot', category: 'Sistema de Iluminação' },
  // Energia
  { title: 'Gerador até 50 KVA devidamente certificado', category: 'Energia' },
  { title: 'Ecrã LED P3.9 — 2x3 metros, suspenso', category: 'Energia' },
  // Artigos Decorativos
  { title: '2 pórticos luminosos de entrada', category: 'Artigos Decorativos' },
  { title: '14 mastros', category: 'Artigos Decorativos' },
  { title: 'Gambiarras', category: 'Artigos Decorativos' },
  { title: 'Festões', category: 'Artigos Decorativos' },
  { title: 'Grinaldas de Luzes', category: 'Artigos Decorativos' },
  // Plano de Marketing e Assessoria
  { title: 'Seleção de meios', category: 'Plano de Marketing e Assessoria' },
  { title: 'Comunicação e Assessoria de Imprensa', category: 'Plano de Marketing e Assessoria' },
]

// ---------------------------------------------------------------------------
// seedChecklistTasksAction
// ---------------------------------------------------------------------------

export async function seedChecklistTasksAction(
  eventId: string
): Promise<{ inserted: number }> {
  const { supabase, member } = await requireOrgAuth()

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) throw new Error('Evento não encontrado')

  // Fetch existing items to skip duplicates (title + category)
  const { data: existing } = await supabase
    .from('event_checklist_items')
    .select('title, category')
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)

  const existingKeys = new Set(
    (existing ?? []).map(i => `${i.title}__${i.category ?? ''}`)
  )

  // Get current max position per category
  const { data: positions } = await supabase
    .from('event_checklist_items')
    .select('category, position')
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)

  const maxPositionByCategory = new Map<string, number>()
  for (const row of positions ?? []) {
    const cat = row.category ?? '__geral__'
    maxPositionByCategory.set(cat, Math.max(maxPositionByCategory.get(cat) ?? 0, row.position))
  }

  const toInsert: {
    event_id: string
    organization_id: string
    title: string
    category: string
    position: number
    is_client_visible: boolean
    status: 'pending'
    notification_rules: { trigger: string; delay_minutes: number; audience: string; channels: string[] }[]
  }[] = []

  for (const item of SEED_ITEMS) {
    const key = `${item.title}__${item.category}`
    if (existingKeys.has(key)) continue

    const cat = item.category
    const currentMax = maxPositionByCategory.get(cat) ?? 0
    const nextPos = currentMax + toInsert.filter(i => i.category === cat).length + 1
    maxPositionByCategory.set(cat, currentMax) // keep original for offset calc

    toInsert.push({
      event_id: eventId,
      organization_id: member.organization_id,
      title: item.title,
      category: item.category,
      position: nextPos,
      is_client_visible: true,
      status: 'pending',
      notification_rules: [{ trigger: 'on_complete', delay_minutes: 0, audience: 'all_clients', channels: ['email', 'portal'] }],
    })
  }

  if (!toInsert.length) return { inserted: 0 }

  const { error } = await supabase
    .from('event_checklist_items')
    .insert(toInsert)

  if (error) throw new Error(error.message)

  return { inserted: toInsert.length }
}

// ---------------------------------------------------------------------------
// syncCategoriesToTemplateAction
// ---------------------------------------------------------------------------

export async function syncCategoriesToTemplateAction(
  eventId: string
): Promise<{ inserted: number }> {
  const { supabase, member } = await requireOrgAuth()

  // Get event + event_type_id
  const { data: event } = await supabase
    .from('events')
    .select('id, event_type_id')
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)
    .single()

  if (!event) throw new Error('Evento não encontrado')

  // Find or create active template for this event type
  let { data: template } = await supabase
    .from('checklist_templates')
    .select('id')
    .eq('organization_id', member.organization_id)
    .eq('event_type_id', event.event_type_id)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (!template) {
    const { data: created, error: createErr } = await supabase
      .from('checklist_templates')
      .insert({
        organization_id: member.organization_id,
        event_type_id: event.event_type_id,
        name: 'Template Base',
        version: 1,
        is_active: true,
        created_by: member.id,
      })
      .select('id')
      .single()

    if (createErr || !created) throw new Error('Erro ao criar template')
    template = created
  }

  // Fetch existing template items to skip duplicates
  const { data: existingTemplateItems } = await supabase
    .from('checklist_template_items')
    .select('title, category')
    .eq('template_id', template.id)

  const existingKeys = new Set(
    (existingTemplateItems ?? []).map(i => `${i.title}__${i.category ?? ''}`)
  )

  // Get max position per category in template
  const { data: tplPositions } = await supabase
    .from('checklist_template_items')
    .select('category, position')
    .eq('template_id', template.id)

  const maxPosByCategory = new Map<string, number>()
  for (const row of tplPositions ?? []) {
    const cat = row.category ?? '__geral__'
    maxPosByCategory.set(cat, Math.max(maxPosByCategory.get(cat) ?? 0, row.position))
  }

  const toInsert: {
    template_id: string
    title: string
    category: string
    position: number
    is_client_visible: boolean
    default_notification_rules: { trigger: string; delay_minutes: number; audience: string; channels: string[] }[]
  }[] = []

  for (const item of SEED_ITEMS) {
    const key = `${item.title}__${item.category}`
    if (existingKeys.has(key)) continue

    const cat = item.category
    const currentMax = maxPosByCategory.get(cat) ?? 0
    const nextPos = currentMax + toInsert.filter(i => i.category === cat).length + 1

    toInsert.push({
      template_id: template.id,
      title: item.title,
      category: item.category,
      position: nextPos,
      is_client_visible: true,
      default_notification_rules: [{ trigger: 'on_complete', delay_minutes: 0, audience: 'all_clients', channels: ['email', 'portal'] }],
    })
  }

  if (!toInsert.length) return { inserted: 0 }

  const { error } = await supabase
    .from('checklist_template_items')
    .insert(toInsert)

  if (error) throw new Error(error.message)

  return { inserted: toInsert.length }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors. If Supabase complains about `category` not being in Insert type, that means Task 2 wasn't applied yet — go back and fix `types/database.ts`.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/events/[eventId]/checklist/actions.ts
git commit -m "feat(checklist): add seedChecklistTasksAction and syncCategoriesToTemplateAction"
```

---

## Task 5: ChecklistBoard — Category Tabs + Seed Button

**Files:**
- Modify: `components/events/ChecklistBoard.tsx`

The board currently renders a flat DnD list + a kanban board view. We add a `<Tabs>` layer above both views. DnD reorder action already scopes by `orderedIds` — no change needed there.

- [ ] **Step 1: Add imports at top of `ChecklistBoard.tsx`**

After the existing imports, add:

```typescript
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { seedChecklistTasksAction, syncCategoriesToTemplateAction } from '@/app/dashboard/events/[eventId]/checklist/actions'
import { Download } from 'lucide-react'
```

(Keep all existing imports; only add these three lines.)

- [ ] **Step 2: Add state for active tab and seed loading**

Inside the `ChecklistBoard` component function, after the existing `useState` declarations, add:

```typescript
const [activeTab, setActiveTab] = useState<string>('Todas')
const [seeding, setSeeding] = useState(false)
```

- [ ] **Step 3: Add derived category list**

After the existing `const percent = calcProgress(...)` line, add:

```typescript
// Derive ordered category list from items
const categoryOrder = [
  'Estruturas em Falta',
  'Sistema de Som',
  'Sistema de Iluminação',
  'Energia',
  'Artigos Decorativos',
  'Plano de Marketing e Assessoria',
]

const categories: string[] = Array.from(
  new Set(
    items
      .map(i => (i as ItemWithMemberAndCounts & { category?: string | null }).category ?? 'Geral')
  )
).sort((a, b) => {
  if (a === 'Geral') return 1
  if (b === 'Geral') return -1
  const ia = categoryOrder.indexOf(a)
  const ib = categoryOrder.indexOf(b)
  if (ia !== -1 && ib !== -1) return ia - ib
  if (ia !== -1) return -1
  if (ib !== -1) return 1
  return a.localeCompare(b)
})

function itemsForTab(tab: string) {
  if (tab === 'Todas') return items
  return items.filter(i =>
    ((i as ItemWithMemberAndCounts & { category?: string | null }).category ?? 'Geral') === tab
  )
}

function tabProgress(tab: string) {
  const tabItems = itemsForTab(tab)
  const done = tabItems.filter(i => i.status === 'completed').length
  return { done, total: tabItems.length }
}
```

- [ ] **Step 4: Add seed handler**

After the `tabProgress` function, add:

```typescript
async function handleSeed() {
  setSeeding(true)
  try {
    const { inserted: eventInserted } = await seedChecklistTasksAction(eventId)
    const { inserted: templateInserted } = await syncCategoriesToTemplateAction(eventId)
    // Reload items from server
    const res = await fetch(`/api/events/${eventId}/checklist-items`)
    if (res.ok) {
      const { items: fresh } = await res.json() as { items: ItemWithMemberAndCounts[] }
      setItems(fresh)
    }
    toast.success(
      eventInserted > 0
        ? `${eventInserted} tarefas adicionadas · ${templateInserted} adicionadas ao template`
        : 'Tarefas já existentes — nenhuma duplicada'
    )
  } catch (err: unknown) {
    toast.error(err instanceof Error ? err.message : 'Erro ao importar tarefas')
  } finally {
    setSeeding(false)
  }
}
```

- [ ] **Step 5: Add GET route for reload**

The `handleSeed` above calls `GET /api/events/${eventId}/checklist-items`. Create that route:

File: `app/api/events/[eventId]/checklist-items/route.ts` — append a GET handler after the existing POST:

```typescript
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: member } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: items, error } = await supabase
    .from('event_checklist_items')
    .select('*, assigned_member:team_members!assigned_to(id, full_name, avatar_url)')
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)
    .order('position', { ascending: true })

  if (error) return NextResponse.json({ error: 'Erro interno' }, { status: 500 })

  return NextResponse.json({ items: items ?? [] })
}
```

- [ ] **Step 6: Wrap the return JSX with Tabs**

In the `return (...)` of `ChecklistBoard`, replace the outer `<div>` wrapper with the following structure. The progress bar, add-item form, and view toggle remain unchanged — only the list/board content gets wrapped in tabs:

```tsx
return (
  <div>
    {/* Progress bar — unchanged */}
    <div className="mb-6 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-500">Progresso</span>
        <span className="text-sm font-semibold text-slate-800">{completed}/{total} etapas · {percent}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>
    </div>

    {/* Seed button */}
    <div className="mb-4 flex justify-end">
      <button
        onClick={handleSeed}
        disabled={seeding}
        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-200 hover:border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
      >
        <Download className="w-4 h-4" />
        {seeding ? 'A importar...' : 'Importar tarefas do evento'}
      </button>
    </div>

    {/* Add item — unchanged */}
    <div className="mb-4">
      {showNewForm ? (
        <NewItemRow
          orgMembers={orgMembers}
          isLoading={addingItem}
          onSave={addItem}
          onCancel={() => setShowNewForm(false)}
        />
      ) : (
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 border border-dashed border-slate-200 hover:border-slate-300 rounded-xl bg-white hover:bg-slate-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar nova etapa
        </button>
      )}
    </div>

    {/* View toggle — unchanged */}
    <div className="flex items-center justify-end mb-3">
      <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5">
        {(['list', 'board'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {v === 'list' ? 'Lista' : 'Board'}
          </button>
        ))}
      </div>
    </div>

    {/* Bulk toolbar — unchanged */}
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
          onClick={() => setSelected(new Set())}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    )}

    {/* Category Tabs */}
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-4 flex-wrap h-auto gap-1 bg-slate-100 p-1 rounded-xl">
        {/* "Todas" tab */}
        {(() => {
          const { done, total: t } = tabProgress('Todas')
          return (
            <TabsTrigger value="Todas" className="rounded-lg text-xs">
              Todas
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-medium">
                {done}/{t}
              </span>
            </TabsTrigger>
          )
        })()}
        {/* One tab per category (hidden if 0 items) */}
        {categories.map(cat => {
          const { done, total: t } = tabProgress(cat)
          if (t === 0) return null
          return (
            <TabsTrigger key={cat} value={cat} className="rounded-lg text-xs">
              {cat}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                done === t && t > 0
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {done}/{t}
              </span>
            </TabsTrigger>
          )
        })}
      </TabsList>

      {/* Render content for "Todas" + each category */}
      {['Todas', ...categories].map(tab => {
        const tabItems = itemsForTab(tab)
        return (
          <TabsContent key={tab} value={tab}>
            {/* List view */}
            {view === 'list' && (
              <DndContext sensors={sensors} collisionDetection={closestCenter}
                onDragEnd={e => {
                  const { active, over } = e
                  if (!over || active.id === over.id) return
                  const previousItems = items
                  const reordered = arrayMove(
                    items,
                    items.findIndex(i => i.id === active.id),
                    items.findIndex(i => i.id === over.id)
                  )
                  setItems(reordered)
                  reorderChecklistItemsAction(eventId, reordered.map(i => i.id)).catch(() => setItems(previousItems))
                }}>
                <SortableContext items={tabItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2 mb-4">
                    {tabItems.map(item =>
                      editingId === item.id ? (
                        <EditRow
                          key={item.id}
                          item={item}
                          orgMembers={orgMembers}
                          onSave={edits => saveEdit(item.id, edits)}
                          onCancel={() => setEditingId(null)}
                          isLoading={loadingId === item.id}
                        />
                      ) : (
                        <SortableChecklistItem
                          key={item.id}
                          item={item}
                          orgMembers={orgMembers}
                          isLoading={loadingId === item.id}
                          isSelected={selected.has(item.id)}
                          onToggleSelect={() => toggleSelect(item.id)}
                          onComplete={() => updateStatus(item.id, 'completed')}
                          onStart={() => updateStatus(item.id, 'in_progress')}
                          onSkip={() => updateStatus(item.id, 'skipped')}
                          onReset={() => updateStatus(item.id, 'pending')}
                          onEdit={() => setEditingId(item.id)}
                          onDelete={() => deleteItem(item.id)}
                          onOpenDetail={() => setSelectedItemId(item.id)}
                        />
                      )
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Board view */}
            {view === 'board' && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleBoardDragEnd}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(Object.keys(colLabels) as ChecklistItemStatus[]).map(status => (
                    <div key={status} className={`rounded-xl border-2 p-3 min-h-[200px] ${colColors[status]}`}>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                        {colLabels[status]}
                        <span className="ml-1.5 font-normal text-slate-400">
                          ({tabItems.filter(i => i.status === status).length})
                        </span>
                      </div>
                      <SortableContext items={tabItems.filter(i => i.status === status).map(i => i.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {tabItems.filter(i => i.status === status).map(item => (
                            <KanbanCard key={item.id} item={item} onClick={() => setSelectedItemId(item.id)} />
                          ))}
                        </div>
                      </SortableContext>
                    </div>
                  ))}
                </div>
              </DndContext>
            )}
          </TabsContent>
        )
      })}
    </Tabs>

    {/* Detail panel — unchanged */}
    {selectedItemId && (() => {
      const item = items.find(i => i.id === selectedItemId)
      if (!item) return null
      return (
        <TaskDetailPanel
          key={selectedItemId}
          itemId={selectedItemId}
          eventId={eventId}
          title={item.title}
          currentMemberId={currentMemberId}
          orgMembers={orgMembers}
          onClose={() => setSelectedItemId(null)}
        />
      )
    })()}
  </div>
)
```

**Note:** Remove the existing `return (...)` block in full and replace with the above. The existing detail panel call at the bottom of the original return should also be removed (it's included above already).

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add components/events/ChecklistBoard.tsx app/api/events/[eventId]/checklist-items/route.ts
git commit -m "feat(ui): add category tabs and seed button to ChecklistBoard"
```

---

## Task 6: Manual Smoke Test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Open an event's checklist page**

Navigate to `/dashboard/events/<eventId>/checklist`.

Expected: page loads normally, no TypeScript/runtime errors in console.

- [ ] **Step 3: Click "Importar tarefas do evento"**

Expected:
- Button shows "A importar..." while loading
- Toast appears: "34 tarefas adicionadas · X adicionadas ao template"
- Tabs appear: Todas, Estruturas em Falta, Sistema de Som, Sistema de Iluminação, Energia, Artigos Decorativos, Plano de Marketing e Assessoria
- Each tab shows correct `N/Total` badge

- [ ] **Step 4: Click each tab**

Expected: only items from that category shown in list/board.

- [ ] **Step 5: Click "Importar tarefas do evento" again**

Expected: toast "Tarefas já existentes — nenhuma duplicada" (0 inserted).

- [ ] **Step 6: Check an item as completed**

Expected: item updates, badge count updates, no errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: smoke test checklist categories feature"
```

---

## Self-Review Checklist

- [x] **Spec coverage — migration:** Task 1 covers `0013_checklist_category.sql`
- [x] **Spec coverage — types:** Task 2 updates `database.ts`
- [x] **Spec coverage — seed data:** Task 4 `SEED_ITEMS` has all 34 items across 6 categories
- [x] **Spec coverage — `seedChecklistTasksAction`:** Task 4 — duplicate skip, bulk insert, returns `{ inserted }`
- [x] **Spec coverage — `syncCategoriesToTemplateAction`:** Task 4 — find/create template, skip dupes, returns `{ inserted }`
- [x] **Spec coverage — tabs UI:** Task 5 — "Todas" + per-category tabs with badge
- [x] **Spec coverage — seed button:** Task 5 — "Importar tarefas do evento" button
- [x] **Spec coverage — DnD scoped per tab:** Task 5 — DnD context uses `tabItems` not `items`
- [x] **Spec coverage — tab with 0 items hidden:** Task 5 — `if (t === 0) return null`
- [x] **Type consistency:** `ItemWithMemberAndCounts` derives from `EventChecklistItem` which gets `category` in Task 2. Cast `(i as ... & { category?: string | null })` is safe until `database.ts` is regenerated.
- [x] **No placeholders:** all steps have exact code.
