// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('@/app/dashboard/events/[eventId]/actions', () => ({
  sendClientUpdateAction: vi.fn(),
}))

vi.mock('@/app/dashboard/events/[eventId]/tasks/actions', () => ({
  createTaskAction: vi.fn(),
}))

const mockFetch = vi.fn(() =>
  Promise.resolve({ ok: false, body: null, json: () => Promise.resolve({}) })
)
vi.stubGlobal('fetch', mockFetch)

import GenerateTasksModal from '@/components/events/GenerateTasksModal'
import ClientUpdateModal from '@/components/events/ClientUpdateModal'
import EventSummaryModal from '@/components/events/EventSummaryModal'
import RiskAnalysisModal from '@/components/events/RiskAnalysisModal'

describe('Modal accessibility', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GenerateTasksModal has no axe violations', async () => {
    const { container } = render(
      <GenerateTasksModal
        eventId="test-event-id"
        onClose={vi.fn()}
        onTasksCreated={vi.fn()}
      />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  }, 15000)

  it('ClientUpdateModal has no axe violations', async () => {
    const { container } = render(
      <ClientUpdateModal
        eventId="test-event-id"
        clientCount={5}
        onClose={vi.fn()}
      />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  }, 15000)

  it('EventSummaryModal has no axe violations', async () => {
    const { container } = render(
      <EventSummaryModal
        eventId="test-event-id"
        onClose={vi.fn()}
      />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  }, 15000)

  it('RiskAnalysisModal has no axe violations', async () => {
    const { container } = render(
      <RiskAnalysisModal
        eventId="test-event-id"
        onClose={vi.fn()}
      />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  }, 15000)
})
