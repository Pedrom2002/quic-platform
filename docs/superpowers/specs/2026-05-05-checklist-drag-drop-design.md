# Checklist Drag & Drop Reordering — Design

**Goal:** Reordenar itens do checklist via drag & drop, persistindo a nova ordem na base de dados.

**Constraints:** Sem schema changes. `position` já existe em `event_checklist_items`. Sem novas dependências além de `@dnd-kit/core` e `@dnd-kit/sortable`.

---

## Localização

Dentro do `ChecklistBoard` existente em `components/events/ChecklistBoard.tsx`.

## Fluxo

1. Drag handle (`GripVertical`) aparece em hover em cada item (junto ao checkbox existente)
2. User arrasta item para nova posição — placeholder visual mostra destino
3. Ao soltar: lista reordena localmente (otimista, sem esperar servidor)
4. `reorderChecklistItemsAction(eventId, orderedIds[])` chamado em background
5. Action recalcula `position = (index + 1) * 10` para todos os ids e faz updates em batch
6. Em caso de erro: reverte para ordem anterior + toast de erro

## Biblioteca

`@dnd-kit/core` + `@dnd-kit/sortable` (instalação: `npm install @dnd-kit/core @dnd-kit/sortable`).

- `<DndContext onDragEnd={handleDragEnd}>` envolve a lista de items
- `<SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>` dentro do DndContext
- Cada `ChecklistItem` usa `useSortable(item.id)` para obter `attributes`, `listeners`, `setNodeRef`, `transform`, `transition`, `isDragging`
- Drag handle: `<button {...listeners} {...attributes}>` com ícone `GripVertical`
- CSS do item durante drag: `opacity-50` quando `isDragging`

## Server Action

`reorderChecklistItemsAction(eventId: string, orderedIds: string[])` em `app/dashboard/events/[eventId]/checklist/actions.ts`:

- Valida auth + ownership (igual às outras actions do ficheiro)
- Valida `orderedIds.length > 0` e `<= 200`
- Para cada id com index i: `position = (i + 1) * 10`
- Updates em batch via `Promise.all` com PATCH individual por item (reutiliza lógica existente via supabase direct update, não via API route)
- Não dispara notificações (reorder não é mudança de status)

## Revert em caso de erro

`handleDragEnd` guarda `previousItems` antes do update otimista. Se a action rejeitar, chama `setItems(previousItems)` + `toast.error`.

## Ficheiros

| Ficheiro | Tipo |
|---|---|
| `app/dashboard/events/[eventId]/checklist/actions.ts` | Modificar — adicionar `reorderChecklistItemsAction` |
| `components/events/ChecklistBoard.tsx` | Modificar — DndContext, SortableContext, drag handles, handleDragEnd |
