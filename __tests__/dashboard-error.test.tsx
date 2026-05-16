// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import DashboardError from '@/app/dashboard/error'

afterEach(() => {
  cleanup()
})

describe('DashboardError', () => {
  it('renders error heading', () => {
    const reset = vi.fn()
    render(<DashboardError error={new Error('test')} reset={reset} />)
    expect(screen.getByRole('heading')).toBeInTheDocument()
  })

  it('calls reset when retry button clicked', () => {
    const reset = vi.fn()
    render(<DashboardError error={new Error('test')} reset={reset} />)
    fireEvent.click(screen.getByRole('button'))
    expect(reset).toHaveBeenCalledOnce()
  })
})
