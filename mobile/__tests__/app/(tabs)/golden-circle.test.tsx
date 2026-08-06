// mobile/__tests__/app/(tabs)/golden-circle.test.tsx
import { describe, it, expect, jest } from '@jest/globals'
import { render } from '@testing-library/react-native'
import GoldenCircleScreen from '../../../app/(tabs)/golden-circle'

jest.mock('expo-video', () => ({
  useVideoPlayer: () => ({ loop: false, muted: false }),
  VideoView: () => null,
}))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

describe('GoldenCircleScreen', () => {
  it('shows the title and the Junta-te em Gold button', () => {
    const { getByText } = render(<GoldenCircleScreen />)

    expect(getByText('Golden Circle')).toBeTruthy()
    expect(getByText('Junta-te em Gold')).toBeTruthy()
  })

  it('renders the banner header image', () => {
    const { getByTestId } = render(<GoldenCircleScreen />)

    expect(getByTestId('banner-header-image')).toBeTruthy()
  })
})
