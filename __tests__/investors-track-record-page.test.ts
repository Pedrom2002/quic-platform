import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockOrder, mockSelect, mockCreateClient } = vi.hoisted(() => ({
  mockOrder: vi.fn(),
  mockSelect: vi.fn(),
  mockCreateClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

beforeEach(() => {
  mockOrder.mockReset()
  mockSelect.mockReset()
  mockCreateClient.mockReset()
  mockSelect.mockReturnValue({ eq: vi.fn().mockReturnValue({ order: mockOrder }) })
  mockCreateClient.mockResolvedValue({
    from: vi.fn().mockReturnValue({ select: mockSelect }),
  })
})

describe('InvestorTrackRecordPage', () => {
  it('renders completed projects ordered by created_at descending, with formatted amounts', async () => {
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'proj-1',
          name: 'Festival de Verão 2025',
          funding_goal_cents: 500000,
          actual_revenue_cents: 620000,
          attendance: 4800,
          created_at: '2025-08-01T10:00:00Z',
        },
        {
          id: 'proj-2',
          name: 'Conferência Tech 2024',
          funding_goal_cents: 200000,
          actual_revenue_cents: null,
          attendance: null,
          created_at: '2024-03-01T10:00:00Z',
        },
      ],
      error: null,
    })
    const { default: InvestorTrackRecordPage } = await import('@/app/investors/(gated)/track-record/page')

    const result = await InvestorTrackRecordPage()
    const html = JSON.stringify(result)

    expect(mockSelect).toHaveBeenCalledWith('id, name, funding_goal_cents, actual_revenue_cents, attendance, created_at')
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(html).toContain('Festival de Verão 2025')
    expect(html).toContain('Conferência Tech 2024')
    expect(html).toContain('6200,00')
    expect(html).toContain('4800')
  })

  it('shows a dash for null actual_revenue_cents and null attendance', async () => {
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'proj-2',
          name: 'Conferência Tech 2024',
          funding_goal_cents: 200000,
          actual_revenue_cents: null,
          attendance: null,
          created_at: '2024-03-01T10:00:00Z',
        },
      ],
      error: null,
    })
    const { default: InvestorTrackRecordPage } = await import('@/app/investors/(gated)/track-record/page')

    const result = await InvestorTrackRecordPage()
    const html = JSON.stringify(result)

    expect(html).toContain('—')
  })

  it('shows an empty-state message when there are no completed projects', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })
    const { default: InvestorTrackRecordPage } = await import('@/app/investors/(gated)/track-record/page')

    const result = await InvestorTrackRecordPage()
    const html = JSON.stringify(result)

    expect(html).toContain('Ainda não há projetos concluídos para mostrar.')
  })

  it('shows an empty-state message when the query returns null data', async () => {
    mockOrder.mockResolvedValue({ data: null, error: null })
    const { default: InvestorTrackRecordPage } = await import('@/app/investors/(gated)/track-record/page')

    const result = await InvestorTrackRecordPage()
    const html = JSON.stringify(result)

    expect(html).toContain('Ainda não há projetos concluídos para mostrar.')
  })
})
