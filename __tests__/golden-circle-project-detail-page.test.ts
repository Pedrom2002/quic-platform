import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSingle, mockCreateClient, mockNotFound } = vi.hoisted(() => ({
  mockSingle: vi.fn(),
  mockCreateClient: vi.fn(),
  mockNotFound: vi.fn(() => { throw new Error('NOT_FOUND') }),
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: mockCreateClient }))
vi.mock('next/navigation', () => ({ notFound: mockNotFound }))

function makeSupabase() {
  const projectsChain = { eq: vi.fn().mockReturnValue({ single: mockSingle }) }
  const emptyListChain = { eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) }
  const approvedInvestorsChain = { eq: vi.fn().mockReturnValue({ data: [], error: null }) }
  return {
    from: vi.fn((table: string) => {
      if (table === 'investment_projects') return { select: vi.fn().mockReturnValue(projectsChain) }
      if (table === 'investments') return { select: vi.fn().mockReturnValue(emptyListChain) }
      if (table === 'investor_documents') return { select: vi.fn().mockReturnValue(emptyListChain) }
      return { select: vi.fn().mockReturnValue(approvedInvestorsChain) }
    }),
  }
}

beforeEach(() => {
  mockSingle.mockReset()
  mockCreateClient.mockReset()
  mockNotFound.mockClear()
})

describe('GoldenCircleProjectDetailPage', () => {
  it('calls notFound when project is missing', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null })
    mockCreateClient.mockResolvedValue(makeSupabase())
    const { default: GoldenCircleProjectDetailPage } = await import('@/app/dashboard/golden-circle/projetos/[projectId]/page')

    await expect(
      GoldenCircleProjectDetailPage({ params: Promise.resolve({ projectId: 'missing' }) })
    ).rejects.toThrow('NOT_FOUND')
  })

  it('renders project name when found', async () => {
    mockSingle.mockResolvedValue({
      data: { id: 'proj-1', name: 'Arena Live Lisboa', description: null, status: 'open', funding_goal_cents: 600000, capacity: null, investment_deadline: null, actual_revenue_cents: null, attendance: null },
      error: null,
    })
    mockCreateClient.mockResolvedValue(makeSupabase())
    const { default: GoldenCircleProjectDetailPage } = await import('@/app/dashboard/golden-circle/projetos/[projectId]/page')

    const result = await GoldenCircleProjectDetailPage({ params: Promise.resolve({ projectId: 'proj-1' }) })
    const html = JSON.stringify(result)

    expect(html).toContain('Arena Live Lisboa')
  })
})
