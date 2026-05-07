# Portal Checklist Accordion Design

## Goal

Remove the useless "Detalhes" tab from the client portal and add expandable accordion rows to each checklist item, revealing completion note, files, and completion timestamp on click.

## Changes

### 1. Remove "Detalhes" tab

- Delete `DetailsTab` component from `PortalClient.tsx`
- In `TabBar`: remove `'details'` from the union type and from the `tabs` array
- In `PortalClient`: change `activeTab` state type to `'progress' | 'documents'`, default `'progress'`
- Remove the `{activeTab === 'details' && ...}` render block

### 2. Accordion on checklist items

Each item row in both completed and pending sections becomes expandable.

**Toggle logic:**
- `expandedIds: Set<string>` state in `ProgressTab` (or lifted to `PortalClient` — keep local in `ProgressTab`)
- Click anywhere on an item row toggles its id in the set
- Multiple items can be open simultaneously

**Chevron indicator:**
- Only shown when the item has content to show: `item.completion_note || item.files.length > 0 || item.completed_at`
- For pending items: only shown when `item.files.length > 0`
- Chevron icon: `▶` when collapsed, `▼` when expanded (CSS rotate transition)
- Positioned at the far right of the row, `text-stone-400`

**Expanded content (accordion panel):**
Rendered below the item title row, inside the same `<li>`, when `expandedIds.has(item.id)`:

```
[completion_note]   — if exists, text-stone-500 text-sm italic leading-relaxed mt-2
[files list]        — if files.length > 0, mt-3 space-y-2, reuses existing <FileRow> component
[completed_at]      — if exists, text-xs text-stone-400 mt-2, formatted "Concluído a d MMM · HH'h'mm"
```

For pending items: only files shown (no note, no date).

**Click area:**
- The entire `<li>` row is clickable (`cursor-pointer`)  
- `e.stopPropagation()` on download links inside `FileRow` (already exists)
- Items with nothing to expand: no cursor change, no chevron, no toggle

**Animation:**
- Accordion panel uses `max-height` + `overflow-hidden` CSS transition (0.2s ease-out) for smooth open/close
- Or simpler: conditional render with no animation (acceptable for first version)

## File Map

| Action | File |
|---|---|
| Modify | `app/portal/[token]/PortalClient.tsx` |

## Exact changes summary

1. Delete `DetailsTab` function (lines 137-176)
2. `TabBar` props: `active: 'progress' | 'documents'`, remove `'details'` from tabs array
3. `PortalClient` state: `useState<'progress' | 'documents'>('progress')`
4. Remove `{activeTab === 'details' && <DetailsTab ... />}` block
5. `ProgressTab`: add `expandedIds: Set<string>` state + toggle handler
6. Completed items `<li>`: add onClick toggle, chevron, accordion panel
7. Pending items `<li>`: add onClick toggle (only if files exist), chevron (only if files), accordion panel (files only)
