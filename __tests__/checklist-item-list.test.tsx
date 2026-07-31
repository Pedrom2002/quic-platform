// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ChecklistItemList } from '@/components/events/checklist/ChecklistItemList'
import type { ItemWithMemberAndCounts } from '@/types/app'

afterEach(cleanup)

function makeItem(overrides: Partial<ItemWithMemberAndCounts> = {}): ItemWithMemberAndCounts {
  return {
    id: 'item-1',
    event_id: 'event-1',
    title: 'Montar palco',
    client_label: 'Palco montado',
    description: null,
    status: 'pending',
    assigned_to: null,
    category: null,
    due_at: null,
    started_at: null,
    completed_at: null,
    completed_by: null,
    completion_note: null,
    is_client_visible: true,
    notification_rules: null,
    parent_item_id: null,
    template_item_id: null,
    position: 0,
    created_at: null,
    updated_at: null,
    assigned_member: null,
    note_count: 0,
    file_count: 0,
    ...overrides,
  } as ItemWithMemberAndCounts
}

const orgMembers = [{ id: 'member-1', full_name: 'Ana Silva' }]

function noop() {
  return vi.fn()
}

function baseProps(overrides: Partial<React.ComponentProps<typeof ChecklistItemList>> = {}) {
  return {
    items: [makeItem()],
    orgMembers,
    editingId: null,
    loadingId: null,
    selected: new Set<string>(),
    onToggleSelect: noop(),
    onComplete: noop(),
    onStart: noop(),
    onSkip: noop(),
    onReset: noop(),
    onEdit: noop(),
    onCancelEdit: noop(),
    onSaveEdit: noop(),
    onDelete: noop(),
    onOpenDetail: noop(),
    ...overrides,
  }
}

describe('ChecklistItemList', () => {
  it('renders without crashing given typical props', () => {
    render(<ChecklistItemList {...baseProps()} />)
    expect(screen.getByText('Montar palco')).toBeInTheDocument()
  })

  it('shows the empty state when there are no items', () => {
    render(<ChecklistItemList {...baseProps({ items: [] })} />)
    expect(screen.getByText('Nenhuma etapa adicionada ainda.')).toBeInTheDocument()
  })

  it('renders SortableChecklistItem (read row) when editingId does not match the item', () => {
    render(<ChecklistItemList {...baseProps({ editingId: null })} />)
    // Read-row shows the "Concluir" action button, only present in SortableChecklistItem.
    expect(screen.getByRole('button', { name: 'Concluir' })).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Título interno')).not.toBeInTheDocument()
  })

  it('renders EditRow when editingId matches the item id', () => {
    render(<ChecklistItemList {...baseProps({ editingId: 'item-1' })} />)
    // Edit-row shows the title/client-label text inputs, only present in EditRow.
    expect(screen.getByPlaceholderText('Título interno')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Label visível pelo cliente/)).toBeInTheDocument()
  })

  it('renders multiple items, mixing edit and sortable rows based on editingId', () => {
    const items = [makeItem({ id: 'item-1', title: 'Item A' }), makeItem({ id: 'item-2', title: 'Item B' })]
    render(<ChecklistItemList {...baseProps({ items, editingId: 'item-2' })} />)
    // item-1 stays as a sortable row -> title rendered as plain text
    expect(screen.getByText('Item A')).toBeInTheDocument()
    // item-2 is being edited -> its title is inside an input, not plain text
    expect(screen.getByDisplayValue('Item B')).toBeInTheDocument()
  })

  it('EditRow text inputs have accessible placeholders (a11y basics)', () => {
    render(<ChecklistItemList {...baseProps({ editingId: 'item-1' })} />)
    expect(screen.getByPlaceholderText('Título interno')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Label visível pelo cliente/)).toBeInTheDocument()
  })

  it('read-row action buttons have discernible text', () => {
    render(<ChecklistItemList {...baseProps()} />)
    expect(screen.getByRole('button', { name: 'Concluir' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ignorar' })).toBeInTheDocument()
  })
})
