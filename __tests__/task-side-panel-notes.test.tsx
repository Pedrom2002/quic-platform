// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

vi.mock('@/app/dashboard/events/[eventId]/tasks/actions', () => ({
  addTaskNoteAction: vi.fn(),
  deleteTaskNoteAction: vi.fn(),
}))

import TaskSidePanelNotes from '@/components/events/TaskSidePanelNotes'
import { addTaskNoteAction, deleteTaskNoteAction } from '@/app/dashboard/events/[eventId]/tasks/actions'
import type { EventTaskNote } from '@/types/app'

afterEach(cleanup)

function makeNote(overrides: Partial<EventTaskNote> = {}): EventTaskNote {
  return {
    id: 'note-1',
    task_id: 'task-1',
    event_id: 'event-1',
    organization_id: 'org-1',
    author_id: 'member-1',
    content: 'Confirmado com o cliente.',
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    author: { id: 'member-1', full_name: 'Ana Silva', avatar_url: null },
    ...overrides,
  }
}

function baseProps(overrides: Partial<React.ComponentProps<typeof TaskSidePanelNotes>> = {}) {
  return {
    eventId: 'event-1',
    taskId: 'task-1',
    currentMemberId: 'member-1',
    notes: [] as EventTaskNote[] | null,
    setNotes: vi.fn(),
    noteContent: '',
    setNoteContent: vi.fn(),
    deletingNoteId: null,
    setDeletingNoteId: vi.fn(),
    ...overrides,
  }
}

describe('TaskSidePanelNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing given typical props', () => {
    render(<TaskSidePanelNotes {...baseProps()} />)
    expect(screen.getByText('Notas')).toBeInTheDocument()
  })

  it('shows a loading state when notes is null', () => {
    render(<TaskSidePanelNotes {...baseProps({ notes: null })} />)
    expect(screen.getByText('A carregar...')).toBeInTheDocument()
  })

  it('shows the empty state when there are no notes', () => {
    render(<TaskSidePanelNotes {...baseProps({ notes: [] })} />)
    expect(screen.getByText('Sem notas ainda.')).toBeInTheDocument()
  })

  it('renders existing notes with author name and content', () => {
    const notes = [makeNote({ content: 'Primeira nota' })]
    render(<TaskSidePanelNotes {...baseProps({ notes })} />)
    expect(screen.getByText('Primeira nota')).toBeInTheDocument()
    expect(screen.getByText('Ana Silva')).toBeInTheDocument()
  })

  it('shows the note count', () => {
    const notes = [makeNote({ id: 'n1' }), makeNote({ id: 'n2' })]
    render(<TaskSidePanelNotes {...baseProps({ notes })} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('disables the save button when noteContent is empty', () => {
    render(<TaskSidePanelNotes {...baseProps({ noteContent: '' })} />)
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  })

  it('enables the save button when noteContent has text', () => {
    render(<TaskSidePanelNotes {...baseProps({ noteContent: 'Uma nota' })} />)
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled()
  })

  it('calls setNoteContent when typing in the textarea', () => {
    const setNoteContent = vi.fn()
    render(<TaskSidePanelNotes {...baseProps({ setNoteContent })} />)
    fireEvent.change(screen.getByPlaceholderText('Adicionar nota...'), { target: { value: 'Olá' } })
    expect(setNoteContent).toHaveBeenCalledWith('Olá')
  })

  it('adding a note optimistically updates state, clears input, and calls addTaskNoteAction', async () => {
    vi.mocked(addTaskNoteAction).mockResolvedValue(makeNote({ id: 'note-real', content: 'Nova nota' }))
    const setNotes = vi.fn()
    const setNoteContent = vi.fn()
    render(<TaskSidePanelNotes {...baseProps({ notes: [], noteContent: 'Nova nota', setNotes, setNoteContent })} />)

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    // Optimistic update happens synchronously before the server action resolves.
    expect(setNotes).toHaveBeenCalled()
    expect(setNoteContent).toHaveBeenCalledWith('')

    await vi.waitFor(() => {
      expect(addTaskNoteAction).toHaveBeenCalledWith('event-1', 'task-1', 'Nova nota')
    })
  })

  it('does not add a note when noteContent is only whitespace', () => {
    const setNotes = vi.fn()
    render(<TaskSidePanelNotes {...baseProps({ noteContent: '   ', setNotes })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(setNotes).not.toHaveBeenCalled()
    expect(addTaskNoteAction).not.toHaveBeenCalled()
  })

  it('submits the note on Cmd/Ctrl+Enter in the textarea', () => {
    const setNotes = vi.fn()
    render(<TaskSidePanelNotes {...baseProps({ noteContent: 'Via atalho', setNotes })} />)
    fireEvent.keyDown(screen.getByPlaceholderText('Adicionar nota...'), { key: 'Enter', ctrlKey: true })
    expect(setNotes).toHaveBeenCalled()
  })

  it('shows a delete button only for notes authored by the current member', () => {
    const notes = [
      makeNote({ id: 'mine', author_id: 'member-1', content: 'Minha nota' }),
      makeNote({ id: 'theirs', author_id: 'member-2', content: 'Nota de outro', author: { id: 'member-2', full_name: 'Bruno Costa', avatar_url: null } }),
    ]
    render(<TaskSidePanelNotes {...baseProps({ notes, currentMemberId: 'member-1' })} />)
    // Only one delete (trash) button should exist, for the note the current member authored.
    expect(screen.getAllByRole('button', { name: 'Eliminar nota' })).toHaveLength(1)
  })

  it('deleting a note removes it optimistically and calls deleteTaskNoteAction', async () => {
    vi.mocked(deleteTaskNoteAction).mockResolvedValue(true)
    const notes = [makeNote({ id: 'note-to-delete', author_id: 'member-1' })]
    const setNotes = vi.fn()
    const setDeletingNoteId = vi.fn()
    render(<TaskSidePanelNotes {...baseProps({ notes, currentMemberId: 'member-1', setNotes, setDeletingNoteId })} />)

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar nota' }))

    expect(setDeletingNoteId).toHaveBeenCalledWith('note-to-delete')
    expect(setNotes).toHaveBeenCalled()

    await vi.waitFor(() => {
      expect(deleteTaskNoteAction).toHaveBeenCalledWith('event-1', 'task-1', 'note-to-delete')
    })
  })

  it('does not show a delete button for notes authored by other members', () => {
    const notes = [makeNote({ id: 'theirs', author_id: 'member-2', author: { id: 'member-2', full_name: 'Bruno Costa', avatar_url: null } })]
    render(<TaskSidePanelNotes {...baseProps({ notes, currentMemberId: 'member-1' })} />)
    expect(screen.queryByRole('button', { name: 'Eliminar nota' })).not.toBeInTheDocument()
  })

  it('note textarea and save button are accessible (a11y basics)', () => {
    render(<TaskSidePanelNotes {...baseProps()} />)
    expect(screen.getByPlaceholderText('Adicionar nota...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    const notes = [makeNote()]
    const { container } = render(<TaskSidePanelNotes {...baseProps({ notes })} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  }, 15000)
})
