// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ChecklistBulkBar } from '@/components/events/checklist/ChecklistBulkBar'

expect.extend(toHaveNoViolations)

afterEach(cleanup)

describe('ChecklistBulkBar', () => {
  let onBulkUpdate: (status: 'completed' | 'in_progress' | 'skipped') => void
  let onClearSelection: () => void

  beforeEach(() => {
    onBulkUpdate = vi.fn<(status: 'completed' | 'in_progress' | 'skipped') => void>()
    onClearSelection = vi.fn<() => void>()
  })

  it('renders nothing when selectedCount is 0', () => {
    const { container } = render(
      <ChecklistBulkBar selectedCount={0} bulkLoading={false} onBulkUpdate={onBulkUpdate} onClearSelection={onClearSelection} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders without crashing given typical props', () => {
    render(
      <ChecklistBulkBar selectedCount={2} bulkLoading={false} onBulkUpdate={onBulkUpdate} onClearSelection={onClearSelection} />
    )
    expect(screen.getByText('2 selecionados')).toBeInTheDocument()
  })

  it('uses singular form for a single selected item', () => {
    render(
      <ChecklistBulkBar selectedCount={1} bulkLoading={false} onBulkUpdate={onBulkUpdate} onClearSelection={onClearSelection} />
    )
    expect(screen.getByText('1 selecionado')).toBeInTheDocument()
  })

  it('calls onBulkUpdate with "completed" when Concluído is clicked', () => {
    render(
      <ChecklistBulkBar selectedCount={3} bulkLoading={false} onBulkUpdate={onBulkUpdate} onClearSelection={onClearSelection} />
    )
    fireEvent.click(screen.getByRole('button', { name: /concluído/i }))
    expect(onBulkUpdate).toHaveBeenCalledWith('completed')
  })

  it('calls onBulkUpdate with "in_progress" when Em Progresso is clicked', () => {
    render(
      <ChecklistBulkBar selectedCount={3} bulkLoading={false} onBulkUpdate={onBulkUpdate} onClearSelection={onClearSelection} />
    )
    fireEvent.click(screen.getByRole('button', { name: /em progresso/i }))
    expect(onBulkUpdate).toHaveBeenCalledWith('in_progress')
  })

  it('calls onBulkUpdate with "skipped" when Saltar is clicked', () => {
    render(
      <ChecklistBulkBar selectedCount={3} bulkLoading={false} onBulkUpdate={onBulkUpdate} onClearSelection={onClearSelection} />
    )
    fireEvent.click(screen.getByRole('button', { name: /saltar/i }))
    expect(onBulkUpdate).toHaveBeenCalledWith('skipped')
  })

  it('calls onClearSelection when the clear (X) button is clicked', () => {
    render(
      <ChecklistBulkBar selectedCount={3} bulkLoading={false} onBulkUpdate={onBulkUpdate} onClearSelection={onClearSelection} />
    )
    fireEvent.click(screen.getByRole('button', { name: /limpar seleção/i }))
    expect(onClearSelection).toHaveBeenCalledOnce()
  })

  it('disables action buttons when bulkLoading is true', () => {
    render(
      <ChecklistBulkBar selectedCount={3} bulkLoading={true} onBulkUpdate={onBulkUpdate} onClearSelection={onClearSelection} />
    )
    expect(screen.getByRole('button', { name: /concluído/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /em progresso/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /saltar/i })).toBeDisabled()
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <ChecklistBulkBar selectedCount={2} bulkLoading={false} onBulkUpdate={onBulkUpdate} onClearSelection={onClearSelection} />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  }, 15000)
})
