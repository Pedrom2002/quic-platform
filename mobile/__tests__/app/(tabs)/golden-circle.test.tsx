// mobile/__tests__/app/(tabs)/golden-circle.test.tsx
import { describe, it, expect, jest } from '@jest/globals'
import { render } from '@testing-library/react-native'
import GoldenCircleScreen from '../../../app/(tabs)/golden-circle'

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

describe('GoldenCircleScreen', () => {
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
    expect(getAllByText('Investor Login').length).toBeGreaterThanOrEqual(2)
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
