import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockOrder, mockSelect, mockCreateClient } = vi.hoisted(() => ({
  mockOrder: vi.fn(),
  mockSelect: vi.fn(),
  mockCreateClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: mockCreateClient }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    ({ type: 'a', props: { href, ...props, children } }),
}))

beforeEach(() => {
  mockOrder.mockReset()
  mockSelect.mockReset()
  mockCreateClient.mockReset()
  mockSelect.mockReturnValue({ order: mockOrder })
  mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue({ select: mockSelect }) })
})

describe('GoldenCircleProjectsPage', () => {
  it('renders projects with formatted funding goal', async () => {
    mockOrder.mockResolvedValue({
      data: [
        { id: 'proj-1', name: 'Arena Live Lisboa', status: 'open', funding_goal_cents: 600000, investment_deadline: '2026-12-31' },
      ],
      error: null,
    })
    const { default: GoldenCircleProjectsPage } = await import('@/app/dashboard/golden-circle/projetos/page')

    const result = await GoldenCircleProjectsPage()
    const html = JSON.stringify(result)

    expect(html).toContain('Arena Live Lisboa')
    expect(html).toContain('6000,00')
  })

  it('shows an empty-state message when there are no projects', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })
    const { default: GoldenCircleProjectsPage } = await import('@/app/dashboard/golden-circle/projetos/page')

    const result = await GoldenCircleProjectsPage()
    const html = JSON.stringify(result)

    expect(html).toContain('Sem projetos')
  })
})
