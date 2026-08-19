// mobile/__tests__/components/InvestorArea.test.tsx
import { describe, it, expect, jest } from '@jest/globals'
import { render, fireEvent } from '@testing-library/react-native'
import { InvestorArea } from '../../components/InvestorArea'
import type { DashboardFetchState } from '../../lib/investorDashboard'

jest.mock('react-native-gifted-charts', () => {
  const { View } = require('react-native')
  return {
    LineChart: () => require('react').createElement(View, { testID: 'mock-line-chart' }),
    PieChart: () => require('react').createElement(View, { testID: 'mock-pie-chart' }),
  }
})

jest.mock('../../lib/supabase', () => ({ supabase: {} }))

jest.mock('../../lib/investorPortfolio', () => ({
  fetchInvestorPortfolio: () => new Promise(() => {}),
}))

jest.mock('../../lib/investorDocuments', () => ({
  fetchInvestorDocuments: () => new Promise(() => {}),
}))

jest.mock('../../lib/investorProfile', () => ({
  fetchInvestorProfile: () => new Promise(() => {}),
  updateInvestorProfile: () => Promise.resolve({}),
}))

jest.mock('../../lib/investorTrackRecord', () => ({
  fetchInvestorTrackRecord: () => new Promise(() => {}),
}))

jest.mock('../../lib/investorInsights', () => ({
  fetchInvestorInsights: () => new Promise(() => {}),
}))

const LOADED_STATE: DashboardFetchState = {
  status: 'loaded',
  stats: {
    investedCents: 150000,
    activeProjects: 2,
    realizedReturnCents: 0,
    projectedReturnCents: 7000,
    estimatedValueCents: 157000,
    distribution: [{ name: 'Projeto A', amountCents: 150000, percentage: 100 }],
  },
}

describe('InvestorArea', () => {
  it('renders all 7 tabs', () => {
    const { getByText } = render(<InvestorArea dashboardFetch={LOADED_STATE} investorId="inv-1" email="investor@example.com" />)

    expect(getByText('Dashboard')).toBeTruthy()
    expect(getByText('Opportunities')).toBeTruthy()
    expect(getByText('Portfolio')).toBeTruthy()
    expect(getByText('Documents')).toBeTruthy()
    expect(getByText('Profile')).toBeTruthy()
    expect(getByText('Track Record')).toBeTruthy()
    expect(getByText('Insights')).toBeTruthy()
  })

  it('shows the dashboard tab by default', () => {
    const { getByText } = render(<InvestorArea dashboardFetch={LOADED_STATE} investorId="inv-1" email="investor@example.com" />)

    expect(getByText('Capital investido')).toBeTruthy()
  })

  it('shows the insights tab loading state when a non-dashboard tab is pressed', () => {
    const { getByText, queryByText } = render(<InvestorArea dashboardFetch={LOADED_STATE} investorId="inv-1" email="investor@example.com" />)

    fireEvent.press(getByText('Insights'))

    expect(getByText('A carregar...')).toBeTruthy()
    expect(queryByText('Capital investido')).toBeNull()
  })

  it('unmounts the previous tab content when switching tabs', () => {
    const { getByText, queryByTestId } = render(<InvestorArea dashboardFetch={LOADED_STATE} investorId="inv-1" email="investor@example.com" />)

    expect(queryByTestId('mock-line-chart')).toBeTruthy()

    fireEvent.press(getByText('Insights'))

    expect(queryByTestId('mock-line-chart')).toBeNull()
  })

  it('switching back to dashboard shows the dashboard content again', () => {
    const { getByText, queryByText } = render(<InvestorArea dashboardFetch={LOADED_STATE} investorId="inv-1" email="investor@example.com" />)

    fireEvent.press(getByText('Insights'))
    expect(queryByText('Capital investido')).toBeNull()

    fireEvent.press(getByText('Dashboard'))
    expect(getByText('Capital investido')).toBeTruthy()
  })

  it('shows the loading message on the dashboard tab while stats are pending', () => {
    const { getByText } = render(<InvestorArea dashboardFetch={{ status: 'loading' }} investorId="inv-1" email="investor@example.com" />)

    expect(getByText('A carregar...')).toBeTruthy()
  })

  it('shows the error message on the dashboard tab when the fetch failed', () => {
    const { getByText } = render(<InvestorArea dashboardFetch={{ status: 'error' }} investorId="inv-1" email="investor@example.com" />)

    expect(getByText('Não foi possível carregar os teus dados. Tenta novamente mais tarde.')).toBeTruthy()
  })
})
