// mobile/__tests__/app/(tabs)/golden-circle.test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render } from '@testing-library/react-native'
import GoldenCircleScreen from '../../../app/(tabs)/golden-circle'

const mockUseSession = jest.fn<() => { session: unknown; loading: boolean }>()
const mockResolveUserRole = jest.fn<(...args: unknown[]) => Promise<unknown>>()
const mockFetchInvestorDashboardStats = jest.fn<(...args: unknown[]) => Promise<unknown>>()

jest.mock('expo-video', () => ({
  useVideoPlayer: (
    _source: unknown,
    setup?: (player: { loop: boolean; muted: boolean; play: () => void }) => void
  ) => {
    const player = { loop: false, muted: false, play: jest.fn() }
    setup?.(player)
    return player
  },
  VideoView: () => null,
}))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => effect(),
}))
jest.mock('../../../hooks/useSession', () => ({
  useSession: () => mockUseSession(),
}))
jest.mock('../../../lib/role', () => ({
  resolveUserRole: (...args: unknown[]) => mockResolveUserRole(...args),
}))
jest.mock('../../../lib/investorDashboard', () => ({
  fetchInvestorDashboardStats: (...args: unknown[]) => mockFetchInvestorDashboardStats(...args),
}))
jest.mock('../../../lib/supabase', () => ({ supabase: {} }))

describe('GoldenCircleScreen', () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ session: null, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'guest' })
    mockFetchInvestorDashboardStats.mockReset()
  })

  it('renders the banner header image', () => {
    const { getByTestId } = render(<GoldenCircleScreen />)

    expect(getByTestId('banner-header-image')).toBeTruthy()
  })

  it('renders every section on a single continuous scroll, not swapped by tabs', () => {
    const { getAllByText } = render(<GoldenCircleScreen />)

    // Todas as seccoes tem de estar montadas em simultaneo (scroll unico),
    // nao trocadas por uma tab ativa como na versao anterior. Cada label
    // aparece 2x: uma vez no TopNav e uma vez como titulo da seccao.
    expect(getAllByText('Opportunities').length).toBeGreaterThanOrEqual(2)
    expect(getAllByText('How It Works').length).toBeGreaterThanOrEqual(2)
    expect(getAllByText('About').length).toBeGreaterThanOrEqual(2)
    expect(getAllByText('Track Record').length).toBeGreaterThanOrEqual(2)
  })

  it('renders the opportunities list', () => {
    const { getByText } = render(<GoldenCircleScreen />)

    expect(getByText('Concerto Sala Tejo — Nov 2026')).toBeTruthy()
  })

  it('renders the track record stats', () => {
    const { getByText } = render(<GoldenCircleScreen />)

    expect(getByText('40+')).toBeTruthy()
    expect(getByText('Concertos produzidos')).toBeTruthy()
  })
})

describe('GoldenCircleScreen — investor role', () => {
  it('renders the institutional content when role is not investor', async () => {
    const { findAllByText, findByText } = render(<GoldenCircleScreen />)

    expect((await findAllByText('Golden Circle')).length).toBeGreaterThanOrEqual(2)
    expect(await findByText('Concerto Sala Tejo — Nov 2026')).toBeTruthy()
  })

  it('renders a pending state message when investor status is pending', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({
      role: 'investor',
      investor: { id: 'inv-1', fullName: 'Nova Candidata', status: 'pending' },
    })

    const { findByText } = render(<GoldenCircleScreen />)

    expect(await findByText(/em análise/i)).toBeTruthy()
  })

  it('renders a rejected state message when investor status is rejected', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({
      role: 'investor',
      investor: { id: 'inv-1', fullName: 'Rejeitado', status: 'rejected' },
    })

    const { findByText } = render(<GoldenCircleScreen />)

    expect(await findByText('Candidatura não foi aprovada')).toBeTruthy()
  })

  it('renders the InvestorDashboard when investor status is approved', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({
      role: 'investor',
      investor: { id: 'inv-1', fullName: 'Carlos Aprovado', status: 'approved' },
    })
    mockFetchInvestorDashboardStats.mockResolvedValue({
      investedCents: 150000,
      activeProjects: 2,
      realizedReturnCents: 0,
      projectedReturnCents: 7000,
      estimatedValueCents: 157000,
      distribution: [{ name: 'Projeto A', amountCents: 150000, percentage: 100 }],
    })

    const { findByText } = render(<GoldenCircleScreen />)

    expect(await findByText('Capital investido')).toBeTruthy()
    expect(mockFetchInvestorDashboardStats).toHaveBeenCalledWith({}, 'inv-1')
  })
})
