// mobile/__tests__/components/InsightsTab.test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { InsightsTab } from '../../components/InsightsTab'

const mockFetchInvestorInsights = jest.fn<(...args: unknown[]) => Promise<unknown>>()

jest.mock('../../lib/supabase', () => ({ supabase: {} }))
jest.mock('../../lib/investorInsights', () => ({
  fetchInvestorInsights: (...args: unknown[]) => mockFetchInvestorInsights(...args),
}))

const ZEROED_BREAKDOWN = [
  { status: 'active', count: 0, totalCents: 0, percentage: 0 },
  { status: 'returned', count: 0, totalCents: 0, percentage: 0 },
  { status: 'written_off', count: 0, totalCents: 0, percentage: 0 },
]

const SAMPLE_BREAKDOWN = [
  { status: 'active', count: 2, totalCents: 150_000, percentage: 75 },
  { status: 'returned', count: 1, totalCents: 50_000, percentage: 25 },
  { status: 'written_off', count: 0, totalCents: 0, percentage: 0 },
]

describe('InsightsTab', () => {
  beforeEach(() => {
    mockFetchInvestorInsights.mockReset()
  })

  it('shows a loading message while the fetch is pending', async () => {
    mockFetchInvestorInsights.mockReturnValue(new Promise(() => {}))

    const { findByText, unmount } = render(<InsightsTab investorId="investor-1" />)

    expect(await findByText('A carregar...')).toBeTruthy()

    unmount()
  })

  it('shows the empty state when all breakdowns have zero count', async () => {
    mockFetchInvestorInsights.mockResolvedValue(ZEROED_BREAKDOWN)

    const { findByText } = render(<InsightsTab investorId="investor-1" />)

    expect(await findByText('Ainda não tens investimentos para analisar.')).toBeTruthy()
  })

  it('shows the 3 status cards with badge, count, total, and percentage', async () => {
    mockFetchInvestorInsights.mockResolvedValue(SAMPLE_BREAKDOWN)

    const { findByText } = render(<InsightsTab investorId="investor-1" />)

    expect(await findByText('Ativo')).toBeTruthy()
    expect(await findByText('2 investimentos')).toBeTruthy()
    expect(await findByText('1500,00 €')).toBeTruthy()
    expect(await findByText('75,0%')).toBeTruthy()

    expect(await findByText('Devolvido')).toBeTruthy()
    expect(await findByText('1 investimento')).toBeTruthy()
    expect(await findByText('500,00 €')).toBeTruthy()
    expect(await findByText('25,0%')).toBeTruthy()

    expect(await findByText('Perdido')).toBeTruthy()
  })

  it('uses singular phrasing for exactly one investment', async () => {
    mockFetchInvestorInsights.mockResolvedValue([
      { status: 'active', count: 1, totalCents: 10_000, percentage: 100 },
      { status: 'returned', count: 0, totalCents: 0, percentage: 0 },
      { status: 'written_off', count: 0, totalCents: 0, percentage: 0 },
    ])

    const { findByText } = render(<InsightsTab investorId="investor-1" />)

    expect(await findByText('1 investimento')).toBeTruthy()
  })

  it('shows an error message when the fetch rejects', async () => {
    mockFetchInvestorInsights.mockRejectedValue(new Error('network error'))

    const { findByText } = render(<InsightsTab investorId="investor-1" />)

    expect(await findByText('Não foi possível carregar os teus insights. Tenta novamente mais tarde.')).toBeTruthy()
  })

  it('does not update state after unmount', async () => {
    let resolveFetch: (value: unknown) => void = () => {}
    mockFetchInvestorInsights.mockReturnValue(new Promise(resolve => { resolveFetch = resolve }))

    const { findByText, unmount } = render(<InsightsTab investorId="investor-1" />)
    expect(await findByText('A carregar...')).toBeTruthy()

    unmount()
    resolveFetch(ZEROED_BREAKDOWN)
  })
})
