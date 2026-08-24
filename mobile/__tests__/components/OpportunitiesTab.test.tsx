// mobile/__tests__/components/OpportunitiesTab.test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, waitFor } from '@testing-library/react-native'
import { ActivityIndicator } from 'react-native'
import { OpportunitiesTab } from '../../components/OpportunitiesTab'

const mockFetchInvestorOpportunities = jest.fn<(...args: unknown[]) => Promise<unknown>>()

jest.mock('../../lib/supabase', () => ({ supabase: {} }))
jest.mock('../../lib/investorOpportunities', () => ({
  fetchInvestorOpportunities: (...args: unknown[]) => mockFetchInvestorOpportunities(...args),
}))

describe('OpportunitiesTab', () => {
  beforeEach(() => {
    mockFetchInvestorOpportunities.mockReset()
  })

  it('shows a loading indicator while the fetch is pending', async () => {
    mockFetchInvestorOpportunities.mockReturnValue(new Promise(() => {}))

    const { UNSAFE_getByType, unmount } = render(<OpportunitiesTab />)

    await waitFor(() => expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy())

    unmount()
  })

  it('shows the empty state when there are no open opportunities', async () => {
    mockFetchInvestorOpportunities.mockResolvedValue([])

    const { findByText } = render(<OpportunitiesTab />)

    expect(await findByText('Sem oportunidades disponíveis de momento.')).toBeTruthy()
  })

  it('shows a card per opportunity with formatted goal and deadline', async () => {
    mockFetchInvestorOpportunities.mockResolvedValue([
      {
        id: 'proj-1',
        name: 'Concerto Sala Tejo — Nov 2026',
        description: 'Produção de médio porte, capacidade 4.000 lugares.',
        fundingGoalCents: 50_000_00,
        investmentDeadline: '2026-11-15',
      },
    ])

    const { findByText } = render(<OpportunitiesTab />)

    expect(await findByText('Concerto Sala Tejo — Nov 2026')).toBeTruthy()
    expect(await findByText('50 000,00 €')).toBeTruthy()
    expect(await findByText('15/11/2026')).toBeTruthy()
    expect(await findByText('Produção de médio porte, capacidade 4.000 lugares.')).toBeTruthy()
  })

  it('omits the deadline row when investmentDeadline is null', async () => {
    mockFetchInvestorOpportunities.mockResolvedValue([
      { id: 'proj-1', name: 'Sem prazo definido', description: null, fundingGoalCents: 10_000_00, investmentDeadline: null },
    ])

    const { findByText, queryByText } = render(<OpportunitiesTab />)

    expect(await findByText('Sem prazo definido')).toBeTruthy()
    expect(queryByText('Prazo')).toBeNull()
  })

  it('shows an error message when the fetch rejects', async () => {
    mockFetchInvestorOpportunities.mockRejectedValue(new Error('network error'))

    const { findByText } = render(<OpportunitiesTab />)

    expect(await findByText('Não foi possível carregar as oportunidades. Tenta novamente mais tarde.')).toBeTruthy()
  })

  it('does not update state after unmount', async () => {
    let resolveFetch: (value: unknown[]) => void = () => {}
    mockFetchInvestorOpportunities.mockReturnValue(
      new Promise(resolve => { resolveFetch = resolve })
    )

    const { UNSAFE_getByType, unmount } = render(<OpportunitiesTab />)
    await waitFor(() => expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy())

    unmount()
    resolveFetch([{ id: 'proj-1', name: 'X', description: null, fundingGoalCents: 100, investmentDeadline: null }])

    // No assertion beyond "does not throw" — the cancellation guard prevents
    // a setState-after-unmount warning/crash. Jest fails the test file if
    // React logs that warning during this test.
  })
})
