// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

vi.mock('@/app/dashboard/events/[eventId]/tasks/actions', () => ({
  createTaskAction: vi.fn(),
  updateTaskAction: vi.fn(),
}))

import TaskSidePanelForm from '@/components/events/TaskSidePanelForm'
import { createTaskAction } from '@/app/dashboard/events/[eventId]/tasks/actions'
import type { EventTask } from '@/types/app'

afterEach(cleanup)

function makeTask(overrides: Partial<EventTask> = {}): EventTask {
  return {
    id: 'task-1',
    event_id: 'event-1',
    organization_id: 'org-1',
    parent_id: null,
    checklist_item_id: null,
    title: 'Confirmar som',
    description: null,
    status: 'pending',
    assigned_to: null,
    due_at: null,
    position: 0,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    assigned_member: null,
    ...overrides,
  }
}

const orgMembers = [
  { id: 'member-1', full_name: 'Ana Silva' },
  { id: 'member-2', full_name: 'Bruno Costa' },
]

const checklistItems = [
  { id: 'ci-1', title: 'Item interno', client_label: 'Item cliente', status: 'pending' },
]

function baseProps(overrides: Partial<React.ComponentProps<typeof TaskSidePanelForm>> = {}) {
  return {
    eventId: 'event-1',
    task: makeTask(),
    orgMembers,
    checklistItems,
    status: 'pending' as const,
    setStatus: vi.fn(),
    assignedTo: '',
    setAssignedTo: vi.fn(),
    dueAt: '',
    setDueAt: vi.fn(),
    checklistItemId: '',
    setChecklistItemId: vi.fn(),
    description: '',
    setDescription: vi.fn(),
    saveField: vi.fn(),
    onCreated: vi.fn(),
    ...overrides,
  }
}

describe('TaskSidePanelForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: false, body: null, json: () => Promise.resolve(null) })
    ))
  })

  it('renders without crashing given typical props', () => {
    render(<TaskSidePanelForm {...baseProps()} />)
    expect(screen.getByText('Estado')).toBeInTheDocument()
    expect(screen.getByText('Responsável')).toBeInTheDocument()
  })

  it('reflects the passed status value in the select', () => {
    render(<TaskSidePanelForm {...baseProps({ status: 'in_progress' })} />)
    const select = screen.getByDisplayValue('Em progresso') as HTMLSelectElement
    expect(select.value).toBe('in_progress')
  })

  it('reflects the passed assignedTo value in the select', () => {
    render(<TaskSidePanelForm {...baseProps({ assignedTo: 'member-2' })} />)
    const select = screen.getByDisplayValue('Bruno Costa') as HTMLSelectElement
    expect(select.value).toBe('member-2')
  })

  it('reflects the passed description value in the textarea', () => {
    render(<TaskSidePanelForm {...baseProps({ description: 'Já tratado' })} />)
    expect(screen.getByDisplayValue('Já tratado')).toBeInTheDocument()
  })

  it('lists checklist items using client_label when available', () => {
    render(<TaskSidePanelForm {...baseProps()} />)
    expect(screen.getByRole('option', { name: 'Item cliente' })).toBeInTheDocument()
  })

  it('calls setStatus and saveField when the status select changes', () => {
    const setStatus = vi.fn()
    const saveField = vi.fn()
    render(<TaskSidePanelForm {...baseProps({ setStatus, saveField })} />)
    const select = screen.getByDisplayValue('A fazer')
    fireEvent.change(select, { target: { value: 'completed' } })
    expect(setStatus).toHaveBeenCalledWith('completed')
    expect(saveField).toHaveBeenCalledWith({ status: 'completed' })
  })

  it('calls setAssignedTo and saveField when the assignee select changes', () => {
    const setAssignedTo = vi.fn()
    const saveField = vi.fn()
    render(<TaskSidePanelForm {...baseProps({ setAssignedTo, saveField })} />)
    const select = screen.getByDisplayValue('Sem atribuição')
    fireEvent.change(select, { target: { value: 'member-1' } })
    expect(setAssignedTo).toHaveBeenCalledWith('member-1')
    expect(saveField).toHaveBeenCalledWith({ assigned_to: 'member-1' })
  })

  it('calls setChecklistItemId and saveField when the checklist link select changes', () => {
    const setChecklistItemId = vi.fn()
    const saveField = vi.fn()
    render(<TaskSidePanelForm {...baseProps({ setChecklistItemId, saveField })} />)
    const select = screen.getByDisplayValue('Sem ligação')
    fireEvent.change(select, { target: { value: 'ci-1' } })
    expect(setChecklistItemId).toHaveBeenCalledWith('ci-1')
    expect(saveField).toHaveBeenCalledWith({ checklist_item_id: 'ci-1' })
  })

  it('calls setDueAt and saveField when the due date input changes', () => {
    const setDueAt = vi.fn()
    const saveField = vi.fn()
    render(<TaskSidePanelForm {...baseProps({ setDueAt, saveField })} />)
    const dateInput = document.querySelector('input[type="datetime-local"]') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2026-08-01T10:00' } })
    expect(setDueAt).toHaveBeenCalledWith('2026-08-01T10:00')
    expect(saveField).toHaveBeenCalledWith({ due_at: new Date('2026-08-01T10:00').toISOString() })
  })

  it('calls setDescription on change and saveField on blur (not on every keystroke)', () => {
    const setDescription = vi.fn()
    const saveField = vi.fn()
    render(<TaskSidePanelForm {...baseProps({ setDescription, saveField })} />)
    const textarea = screen.getByPlaceholderText('Adicionar descrição...')
    fireEvent.change(textarea, { target: { value: 'Nova descrição' } })
    expect(setDescription).toHaveBeenCalledWith('Nova descrição')
    expect(saveField).not.toHaveBeenCalled()
    fireEvent.blur(textarea)
    expect(saveField).toHaveBeenCalledWith({ description: null })
  })

  it('shows the "Sugerir responsável" AI trigger button when unassigned and multiple org members exist', () => {
    render(<TaskSidePanelForm {...baseProps({ assignedTo: '' })} />)
    expect(screen.getByRole('button', { name: /sugerir responsável/i })).toBeInTheDocument()
  })

  it('does not show the suggest-assignee trigger when a member is already assigned', () => {
    render(<TaskSidePanelForm {...baseProps({ assignedTo: 'member-1' })} />)
    expect(screen.queryByRole('button', { name: /sugerir responsável/i })).not.toBeInTheDocument()
  })

  it('calls fetch and does not crash when the "Sugerir responsável" button is clicked', async () => {
    render(<TaskSidePanelForm {...baseProps()} />)
    const button = screen.getByRole('button', { name: /sugerir responsável/i })
    fireEvent.click(button)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/ai/suggest-assignee',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('shows the "Gerar descrição" AI trigger button', () => {
    render(<TaskSidePanelForm {...baseProps()} />)
    expect(screen.getByRole('button', { name: /gerar descrição/i })).toBeInTheDocument()
  })

  it('shows "Regenerar descrição" label instead when description is already present', () => {
    render(<TaskSidePanelForm {...baseProps({ description: 'Existente' })} />)
    expect(screen.getByRole('button', { name: /regenerar descrição/i })).toBeInTheDocument()
  })

  it('calls fetch and does not crash when the "Gerar descrição" button is clicked', async () => {
    render(<TaskSidePanelForm {...baseProps()} />)
    const button = screen.getByRole('button', { name: /gerar descrição/i })
    fireEvent.click(button)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/ai/describe-task',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('does not call createTaskAction unless the subtask creation flow is triggered', () => {
    render(<TaskSidePanelForm {...baseProps()} />)
    expect(createTaskAction).not.toHaveBeenCalled()
  })

  it('form selects and inputs are labeled (a11y basics)', () => {
    render(<TaskSidePanelForm {...baseProps()} />)
    expect(screen.getByLabelText('Estado')).toBeInTheDocument()
    expect(screen.getByLabelText('Responsável')).toBeInTheDocument()
    expect(screen.getByLabelText('Ligar a checklist (opcional)')).toBeInTheDocument()
    expect(screen.getByLabelText('Descrição')).toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    const { container } = render(<TaskSidePanelForm {...baseProps()} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  }, 15000)
})
