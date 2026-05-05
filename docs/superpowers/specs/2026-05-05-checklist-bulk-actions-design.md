# Checklist Bulk Actions — Design

**Goal:** Marcar múltiplos items do checklist com novo status de uma vez.

**Constraints:** Sem novas dependências. Sem schema changes. Dispara notificações igual ao comportamento individual.

---

## Localização

Dentro do `ChecklistBoard` existente em `components/events/ChecklistBoard.tsx`.

## Fluxo

1. Checkbox aparece em cada item (visível em hover, sempre visível em mobile)
2. Selecionar 1+ items → toolbar sticky aparece no topo da lista
3. Toolbar mostra: "X selecionados" + 3 botões: "Concluído", "Em Progresso", "Saltar" + "Cancelar"
4. Clicar ação → `bulkUpdateChecklistStatusAction(eventId, ids[], status)` → update em batch
5. Para items marcados como `completed`: dispara notificações igual ao `completeItemAction` individual
6. UI atualiza otimisticamente, reverte em caso de erro

## Novo Server Action

`app/dashboard/events/[eventId]/checklist/actions.ts` — nova função:

```typescript
bulkUpdateChecklistStatusAction(eventId: string, ids: string[], status: ChecklistItemStatus): Promise<void>
```

- Valida auth + ownership igual às outras actions do ficheiro
- Update em batch: `supabase.from('event_checklist_items').update({ status }).in('id', ids).eq('event_id', eventId)`
- Para cada id com `status === 'completed'`: chama `dispatchNotificationsForItem` (já existe)
- Máximo 50 items por chamada

## Estado no ChecklistBoard

```typescript
const [selected, setSelected] = useState<Set<string>>(new Set())
```

- Toggle individual: click no checkbox
- "Selecionar todos": checkbox no header da toolbar
- Limpar seleção: após ação concluída ou "Cancelar"

## Ficheiros

| Ficheiro | Tipo |
|---|---|
| `app/dashboard/events/[eventId]/checklist/actions.ts` | Modificado — adicionar `bulkUpdateChecklistStatusAction` |
| `components/events/ChecklistBoard.tsx` | Modificado — checkboxes + toolbar de seleção |
