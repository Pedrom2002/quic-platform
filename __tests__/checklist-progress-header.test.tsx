// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ChecklistProgressHeader } from '@/components/events/checklist/ChecklistProgressHeader'

expect.extend(toHaveNoViolations)

afterEach(cleanup)

describe('ChecklistProgressHeader', () => {
  it('renders without crashing given typical props', () => {
    render(<ChecklistProgressHeader completed={3} total={10} percent={30} />)
    expect(screen.getByText('Progresso')).toBeInTheDocument()
  })

  it('shows completed/total count and percentage text', () => {
    render(<ChecklistProgressHeader completed={4} total={8} percent={50} />)
    expect(screen.getByText('4/8 etapas · 50%')).toBeInTheDocument()
  })

  it('sets the progress bar width to match percent', () => {
    const { container } = render(<ChecklistProgressHeader completed={7} total={10} percent={70} />)
    const bar = container.querySelector('.bg-green-500') as HTMLElement
    expect(bar).toBeInTheDocument()
    expect(bar.style.width).toBe('70%')
  })

  it('handles zero progress', () => {
    const { container } = render(<ChecklistProgressHeader completed={0} total={0} percent={0} />)
    expect(screen.getByText('0/0 etapas · 0%')).toBeInTheDocument()
    const bar = container.querySelector('.bg-green-500') as HTMLElement
    expect(bar.style.width).toBe('0%')
  })

  it('handles full completion (100%)', () => {
    const { container } = render(<ChecklistProgressHeader completed={5} total={5} percent={100} />)
    expect(screen.getByText('5/5 etapas · 100%')).toBeInTheDocument()
    const bar = container.querySelector('.bg-green-500') as HTMLElement
    expect(bar.style.width).toBe('100%')
  })

  it('has no axe violations', async () => {
    const { container } = render(<ChecklistProgressHeader completed={3} total={10} percent={30} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  }, 15000)
})
