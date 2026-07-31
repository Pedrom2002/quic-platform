// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ChecklistBoardView } from '@/components/events/checklist/ChecklistBoardView'
import type { ItemWithMemberAndCounts, ChecklistItemStatus } from '@/types/app'

expect.extend(toHaveNoViolations)

afterEach(cleanup)

function makeItem(overrides: Partial<ItemWithMemberAndCounts> = {}): ItemWithMemberAndCounts {
  return {
    id: 'item-1',
    event_id: 'event-1',
    title: 'Montar palco',
    client_label: null,
    description: null,
    status: 'pending' as ChecklistItemStatus,
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

describe('ChecklistBoardView', () => {
  it('renders without crashing given typical props', () => {
    const items = [makeItem()]
    render(<ChecklistBoardView items={items} sensors={[]} onDragEnd={vi.fn()} onOpenDetail={vi.fn()} />)
    expect(screen.getByText('Montar palco')).toBeInTheDocument()
  })

  it('renders all four status columns', () => {
    render(<ChecklistBoardView items={[]} sensors={[]} onDragEnd={vi.fn()} onOpenDetail={vi.fn()} />)
    expect(screen.getByText('A fazer')).toBeInTheDocument()
    expect(screen.getByText('Em progresso')).toBeInTheDocument()
    expect(screen.getByText('Concluído')).toBeInTheDocument()
    expect(screen.getByText('Ignorado')).toBeInTheDocument()
  })

  it('groups items into the correct status column', () => {
    const items = [
      makeItem({ id: '1', title: 'Pendente Item', status: 'pending' }),
      makeItem({ id: '2', title: 'Progresso Item', status: 'in_progress' }),
      makeItem({ id: '3', title: 'Feito Item', status: 'completed' }),
      makeItem({ id: '4', title: 'Ignorado Item', status: 'skipped' }),
    ]
    render(<ChecklistBoardView items={items} sensors={[]} onDragEnd={vi.fn()} onOpenDetail={vi.fn()} />)

    expect(screen.getByText('Pendente Item')).toBeInTheDocument()
    expect(screen.getByText('Progresso Item')).toBeInTheDocument()
    expect(screen.getByText('Feito Item')).toBeInTheDocument()
    expect(screen.getByText('Ignorado Item')).toBeInTheDocument()
  })

  it('shows the item count per column', () => {
    const items = [
      makeItem({ id: '1', title: 'A', status: 'pending' }),
      makeItem({ id: '2', title: 'B', status: 'pending' }),
      makeItem({ id: '3', title: 'C', status: 'completed' }),
    ]
    render(<ChecklistBoardView items={items} sensors={[]} onDragEnd={vi.fn()} onOpenDetail={vi.fn()} />)
    // "A fazer" column has 2 items, "Concluído" has 1; other columns have 0.
    const counts = screen.getAllByText(/^[0-9]+$/).map(el => el.textContent)
    expect(counts).toEqual(expect.arrayContaining(['2', '1', '0']))
  })

  it('shows an empty-state placeholder for empty columns', () => {
    const items = [makeItem({ id: '1', title: 'Only Pending', status: 'pending' })]
    render(<ChecklistBoardView items={items} sensors={[]} onDragEnd={vi.fn()} onOpenDetail={vi.fn()} />)
    const emptyStates = screen.getAllByText('Sem tarefas')
    // pending has an item, so the other 3 columns should show the empty state.
    expect(emptyStates).toHaveLength(3)
  })

  it('calls onOpenDetail when a card is clicked', () => {
    const onOpenDetail = vi.fn()
    const items = [makeItem({ id: 'item-42', title: 'Clique aqui' })]
    render(<ChecklistBoardView items={items} sensors={[]} onDragEnd={vi.fn()} onOpenDetail={onOpenDetail} />)
    fireEvent.click(screen.getByText('Clique aqui'))
    expect(onOpenDetail).toHaveBeenCalledWith('item-42')
  })

  it('has no axe violations', async () => {
    const items = [makeItem()]
    const { container } = render(<ChecklistBoardView items={items} sensors={[]} onDragEnd={vi.fn()} onOpenDetail={vi.fn()} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  }, 15000)
})
