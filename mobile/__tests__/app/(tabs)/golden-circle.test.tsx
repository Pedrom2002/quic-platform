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
  it('shows the Junta-te ao Golden Circle button', () => {
    const { getByText } = render(<GoldenCircleScreen />)

    expect(getByText('Junta-te ao Golden Circle')).toBeTruthy()
  })

  it('renders the banner header image', () => {
    const { getByTestId } = render(<GoldenCircleScreen />)

    expect(getByTestId('banner-header-image')).toBeTruthy()
  })
})
