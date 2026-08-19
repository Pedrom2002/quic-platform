// mobile/__tests__/components/TrackRecordTab.test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { TrackRecordTab } from '../../components/TrackRecordTab'

const mockFetchInvestorTrackRecord = jest.fn<(...args: unknown[]) => Promise<unknown>>()

jest.mock('../../lib/supabase', () => ({ supabase: {} }))
jest.mock('../../lib/investorTrackRecord', () => ({
  fetchInvestorTrackRecord: (...args: unknown[]) => mockFetchInvestorTrackRecord(...args),
}))

const SAMPLE_SUMMARY = {
  completedCount: 2,
  totalRevenueCents: 670_000,
  totalAttendance: 5_300,
  projects: [
    { id: 'proj-1', name: 'Concerto Sala Tejo', fundingGoalCents: 500_000, actualRevenueCents: 550_000, attendance: 3800 },
    { id: 'proj-2', name: 'Festival de Verão', fundingGoalCents: 100_000, actualRevenueCents: 120_000, attendance: 1500 },
  ],
}

describe('TrackRecordTab', () => {
  beforeEach(() => {
    mockFetchInvestorTrackRecord.mockReset()
  })

  it('shows a loading message while the fetch is pending', async () => {
    mockFetchInvestorTrackRecord.mockReturnValue(new Promise(() => {}))

    const { findByText, unmount } = render(<TrackRecordTab />)

    expect(await findByText('A carregar...')).toBeTruthy()

    unmount()
  })

  it('shows the empty state when there are no completed projects', async () => {
    mockFetchInvestorTrackRecord.mockResolvedValue({ completedCount: 0, totalRevenueCents: 0, totalAttendance: 0, projects: [] })

    const { findByText } = render(<TrackRecordTab />)

    expect(await findByText('Ainda não há projetos concluídos para mostrar.')).toBeTruthy()
  })

  it('shows the 3 metric cards with correct values', async () => {
    mockFetchInvestorTrackRecord.mockResolvedValue(SAMPLE_SUMMARY)

    const { findByText } = render(<TrackRecordTab />)

    expect(await findByText('2')).toBeTruthy()
    expect(await findByText('6700,00 €')).toBeTruthy()
    expect(await findByText('5300')).toBeTruthy()
  })

  it('shows a card per project with name, goal, revenue, and attendance', async () => {
    mockFetchInvestorTrackRecord.mockResolvedValue(SAMPLE_SUMMARY)

    const { findByText } = render(<TrackRecordTab />)

    expect(await findByText('Concerto Sala Tejo')).toBeTruthy()
    expect(await findByText('5000,00 €')).toBeTruthy()
    expect(await findByText('5500,00 €')).toBeTruthy()
    expect(await findByText('3800')).toBeTruthy()
  })

  it('shows a dash for null actualRevenueCents and attendance', async () => {
    mockFetchInvestorTrackRecord.mockResolvedValue({
      completedCount: 1,
      totalRevenueCents: 0,
      totalAttendance: 0,
      projects: [{ id: 'proj-1', name: 'Sem dados', fundingGoalCents: 100_000, actualRevenueCents: null, attendance: null }],
    })

    const { findAllByText, findByText } = render(<TrackRecordTab />)

    expect(await findByText('Sem dados')).toBeTruthy()
    const dashes = await findAllByText('—')
    expect(dashes.length).toBe(2)
  })

  it('shows an error message when the fetch rejects', async () => {
    mockFetchInvestorTrackRecord.mockRejectedValue(new Error('network error'))

    const { findByText } = render(<TrackRecordTab />)

    expect(await findByText('Não foi possível carregar o histórico. Tenta novamente mais tarde.')).toBeTruthy()
  })

  it('does not update state after unmount', async () => {
    let resolveFetch: (value: unknown) => void = () => {}
    mockFetchInvestorTrackRecord.mockReturnValue(new Promise(resolve => { resolveFetch = resolve }))

    const { findByText, unmount } = render(<TrackRecordTab />)
    expect(await findByText('A carregar...')).toBeTruthy()

    unmount()
    resolveFetch({ completedCount: 0, totalRevenueCents: 0, totalAttendance: 0, projects: [] })
  })
})
