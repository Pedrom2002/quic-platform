# Checklist Categories & Event Task Seed

**Date:** 2026-05-25
**Status:** Approved

## Problem

The checklist for an event is a flat list with no grouping. For a live production event with 30+ items across Structures, Sound, Lighting, Energy, Decoration, and Marketing, the list is unmanageable. No way to see progress per domain at a glance.

## Goal

1. Add a `category` field to checklist items (event + template).
2. Display the checklist as horizontal tabs — one tab per category.
3. Bulk-seed a specific set of tasks (provided by user) into an open event.
4. Sync those categories back to the active checklist template for that event type.

## Decisions

- **Layout:** Horizontal tabs (`components/ui/tabs.tsx` already exists).
- **Item detail:** Short title visible; click opens existing `TaskDetailPanel` (notes, files, assignee).
- **Scope:** Seed current event AND update template.
- **Approach:** Add `category text` column — nullable, no breaking changes.

---

## Schema

### Migration `0013_checklist_category.sql`

```sql
ALTER TABLE event_checklist_items
  ADD COLUMN category text;

ALTER TABLE checklist_template_items
  ADD COLUMN category text;
```

- Nullable. Existing items: `category = NULL` → shown under "Geral" tab.
- No RLS changes needed (column inherits existing policies).

---

## Task Seed Data

Six categories with their items:

### Estruturas em Falta
1. Painel de luz para a zona dos camarins
2. Ligações elétricas para todas as estruturas, cablagem geral
3. 16 piquetes com disponibilidade para manutenção 24 horas
4. Photo Booth
5. Tenda logística 2m x 2m
6. Palco 10m x 10m
7. Régies cobertas 3m x 3m

### Sistema de Som
1. Line-array 8 topos por lado + subgrave 1 por lado
2. Mesa de mistura de palco independente stage 1
3. Mesa de mistura de palco independente stage 2
4. Monitores — até 8 unidades por stage
5. 2 side-fills por lado
6. 8 canais in-ear
7. Microfonia adequada
8. Cablagem e acessórios de som

### Sistema de Iluminação
1. 8 projetores Spot One
2. 8 Wash LED
3. 4 Beam
4. 6 Strobes
5. 1 máquina de fumo/haze
6. 4 blinders de 4 unidades
7. 4 blinders de 2 unidades
8. 2 varas de Par 56 para frente de palco
9. Mesa de controlo de iluminação
10. Followspot

### Energia
1. Gerador até 50 KVA devidamente certificado
2. Ecrã LED P3.9 — 2x3 metros, suspenso

### Artigos Decorativos
1. 2 pórticos luminosos de entrada
2. 14 mastros
3. Gambiarras
4. Festões
5. Grinaldas de Luzes

### Plano de Marketing e Assessoria
1. Seleção de meios
2. Comunicação e Assessoria de Imprensa

---

## Server Actions

### `seedChecklistTasksAction(eventId: string): Promise<{ inserted: number }>`

Location: `app/dashboard/events/[eventId]/checklist/actions.ts`

- Auth via `requireOrgAuth`.
- Assert event ownership.
- For each item in the seed list: check if title+category already exists (skip duplicates).
- Bulk insert missing items with `position` = `MAX(position) + 1` per category group.
- Returns count of inserted items.

### `syncCategoriesToTemplateAction(eventId: string): Promise<{ inserted: number }>`

Location: `app/dashboard/events/[eventId]/checklist/actions.ts`

- Auth via `requireOrgAuth`.
- Fetch event → `event_type_id`.
- Find active `checklist_template` for that `event_type_id` + `organization_id`.
- If none exists: create one named "Template Base" for that event type, with `created_by = member.id`, `version = 1`, `is_active = true`.
- For each seed item: if `title + category` not already in `checklist_template_items`, insert.
- Returns count of inserted template items.

---

## UI Changes

### `ChecklistBoard` (`components/events/ChecklistBoard.tsx`)

Current: flat list with DnD.

Changes:
- Derive `categories: string[]` from items — unique values, `null` items mapped to `"Geral"`, sorted alphabetically with "Geral" last.
- Add `"Todas"` tab always first showing all items + global progress badge.
- Render `<Tabs>` with one `<TabsContent>` per category.
- Each tab trigger shows: category name + `N/Total` badge (completed/total).
- DnD scoped to items within same active tab (reorder within category only).
- Clicking an item opens existing `TaskDetailPanel` — no new panel needed.

### Seed Button

Add a `"Importar tarefas do evento"` button in `ChecklistBoard` (visible only when item count < 5, or always via overflow menu — to avoid accidental re-seed).

Calls `seedChecklistTasksAction` → on success calls `syncCategoriesToTemplateAction` → toast with count of inserted items.

---

## Data Flow

```
User clicks "Importar tarefas"
  → seedChecklistTasksAction(eventId)
      → INSERT into event_checklist_items (with category)
  → syncCategoriesToTemplateAction(eventId)
      → find/create template
      → INSERT into checklist_template_items (with category)
  → setItems(updatedItems)   ← optimistic update via re-fetch
  → toast "X tarefas adicionadas"

User switches tab
  → filter items by category client-side (no server call)

User checks item
  → existing updateChecklistItemAction (unchanged)
```

---

## Error Handling

- `seedChecklistTasksAction`: if event not found or not owned → throw. Duplicate items silently skipped.
- `syncCategoriesToTemplateAction`: if event type has no template → create one. Errors surface as toast via existing pattern.
- Tab with 0 items: hidden (not rendered).

---

## Out of Scope

- Reordering categories (can add `category_position` column later if needed).
- Renaming categories inline.
- Deleting categories (deleting all items in a category removes the tab automatically).
- Client-visible category labels in the portal.
