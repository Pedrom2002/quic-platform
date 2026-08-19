// mobile/__tests__/components/PortfolioTab.test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, fireEvent } from '@testing-library/react-native'
import { PortfolioTab } from '../../components/PortfolioTab'

const mockFetchInvestorPortfolio = jest.fn<(...args: unknown[]) => Promise<unknown>>()

jest.mock('../../lib/supabase', () => ({ supabase: {} }))
jest.mock('../../lib/investorPortfolio', () => ({
  fetchInvestorPortfolio: (...args: unknown[]) => mockFetchInvestorPortfolio(...args),
}))

const SAMPLE_SUMMARY = {
  totalCents: 180_000,
  investmentCount: 3,
  activeCount: 2,
  rows: [
    { id: 'inv-1', projectName: 'Concerto Sala Tejo', projectStatus: 'open', amountCents: 100_000, returnPercentage: 15, investmentStatus: 'active' },
    { id: 'inv-2', projectName: 'Digressão Nacional', projectStatus: 'completed', amountCents: 50_000, returnPercentage: null, investmentStatus: 'returned' },
    { id: 'inv-3', projectName: 'Festival de Verão', projectStatus: 'closed', amountCents: 30_000, returnPercentage: 8, investmentStatus: 'active' },
  ],
}

describe('PortfolioTab', () => {
  beforeEach(() => {
    mockFetchInvestorPortfolio.mockReset()
  })

  it('shows a loading message while the fetch is pending', async () => {
    mockFetchInvestorPortfolio.mockReturnValue(new Promise(() => {}))

    const { findByText, unmount } = render(<PortfolioTab investorId="investor-1" />)

    expect(await findByText('A carregar...')).toBeTruthy()

    unmount()
  })

  it('shows the empty state when there are no investments', async () => {
    mockFetchInvestorPortfolio.mockResolvedValue({ totalCents: 0, investmentCount: 0, activeCount: 0, rows: [] })

    const { findByText } = render(<PortfolioTab investorId="investor-1" />)

    expect(await findByText('Ainda não tens investimentos.')).toBeTruthy()
  })

  it('shows the 3 metric cards with correct values', async () => {
    mockFetchInvestorPortfolio.mockResolvedValue(SAMPLE_SUMMARY)

    const { findByText } = render(<PortfolioTab investorId="investor-1" />)

    expect(await findByText('180 000,00 €')).toBeTruthy()
    expect(await findByText('3')).toBeTruthy()
    expect(await findByText('2')).toBeTruthy()
  })

  it('shows a card per investment with phase badge, capital, return, and next milestone', async () => {
    mockFetchInvestorPortfolio.mockResolvedValue(SAMPLE_SUMMARY)

    const { findByText } = render(<PortfolioTab investorId="investor-1" />)

    expect(await findByText('Concerto Sala Tejo')).toBeTruthy()
    expect(await findByText('Em venda')).toBeTruthy()
    expect(await findByText('100 000,00 €')).toBeTruthy()
    expect(await findByText('+15.0%')).toBeTruthy()
    expect(await findByText('Fecho early bird')).toBeTruthy()
  })

  it('shows a dash for return percentage and known milestone for a completed investment', async () => {
    mockFetchInvestorPortfolio.mockResolvedValue(SAMPLE_SUMMARY)

    const { findByText } = render(<PortfolioTab investorId="investor-1" />)

    expect(await findByText('Settlement')).toBeTruthy()
    expect(await findByText('Distribuição')).toBeTruthy()
  })

  it('falls back to "Sem fase" and "—" for an unknown or null project status', async () => {
    mockFetchInvestorPortfolio.mockResolvedValue({
      totalCents: 10_000,
      investmentCount: 1,
      activeCount: 1,
      rows: [{ id: 'inv-1', projectName: 'Projeto sem nome', projectStatus: null, amountCents: 10_000, returnPercentage: null, investmentStatus: 'active' }],
    })

    const { findByText } = render(<PortfolioTab investorId="investor-1" />)

    expect(await findByText('Sem fase')).toBeTruthy()
    expect(await findByText('—')).toBeTruthy()
  })

  it('filters to active investments only when the "Ativos" filter is pressed', async () => {
    mockFetchInvestorPortfolio.mockResolvedValue(SAMPLE_SUMMARY)

    const { findByText, getByText, queryByText } = render(<PortfolioTab investorId="investor-1" />)
    await findByText('Concerto Sala Tejo')

    fireEvent.press(getByText('Ativos'))

    expect(getByText('Concerto Sala Tejo')).toBeTruthy()
    expect(getByText('Festival de Verão')).toBeTruthy()
    expect(queryByText('Digressão Nacional')).toBeNull()
  })

  it('filters to completed investments only when the "Concluídos" filter is pressed', async () => {
    mockFetchInvestorPortfolio.mockResolvedValue(SAMPLE_SUMMARY)

    const { findByText, getByText, queryByText } = render(<PortfolioTab investorId="investor-1" />)
    await findByText('Concerto Sala Tejo')

    fireEvent.press(getByText('Concluídos'))

    expect(getByText('Digressão Nacional')).toBeTruthy()
    expect(queryByText('Concerto Sala Tejo')).toBeNull()
  })

  it('shows an empty-filter message when no rows match the selected filter', async () => {
    mockFetchInvestorPortfolio.mockResolvedValue({
      totalCents: 100_000,
      investmentCount: 1,
      activeCount: 0,
      rows: [{ id: 'inv-1', projectName: 'Only Returned', projectStatus: 'completed', amountCents: 100_000, returnPercentage: null, investmentStatus: 'returned' }],
    })

    const { findByText, getByText } = render(<PortfolioTab investorId="investor-1" />)
    await findByText('Only Returned')

    fireEvent.press(getByText('Ativos'))

    expect(await findByText('Sem projetos para este filtro.')).toBeTruthy()
  })

  it('shows an error message when the fetch rejects', async () => {
    mockFetchInvestorPortfolio.mockRejectedValue(new Error('network error'))

    const { findByText } = render(<PortfolioTab investorId="investor-1" />)

    expect(await findByText('Não foi possível carregar o teu portfolio. Tenta novamente mais tarde.')).toBeTruthy()
  })

  it('does not update state after unmount', async () => {
    let resolveFetch: (value: unknown) => void = () => {}
    mockFetchInvestorPortfolio.mockReturnValue(new Promise(resolve => { resolveFetch = resolve }))

    const { findByText, unmount } = render(<PortfolioTab investorId="investor-1" />)
    expect(await findByText('A carregar...')).toBeTruthy()

    unmount()
    resolveFetch({ totalCents: 0, investmentCount: 0, activeCount: 0, rows: [] })
  })

  it('calls fetchInvestorPortfolio with the supabase client and investorId prop', async () => {
    mockFetchInvestorPortfolio.mockResolvedValue({ totalCents: 0, investmentCount: 0, activeCount: 0, rows: [] })

    render(<PortfolioTab investorId="investor-77" />)

    expect(mockFetchInvestorPortfolio).toHaveBeenCalledWith({}, 'investor-77')
  })
})
