import { describe, it, expect, jest } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { BannerHeader } from '../../components/BannerHeader'

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 0, left: 0, right: 0 }),
}))

describe('BannerHeader', () => {
  it('renders an image with the given source', () => {
    const { getByTestId } = render(
      <BannerHeader source={{ uri: 'https://example.com/banner.png' }} />
    )

    const image = getByTestId('banner-header-image')
    expect(image.props.source).toEqual({ uri: 'https://example.com/banner.png' })
  })

  it('applies a fixed 220px height and full width', () => {
    const { getByTestId } = render(
      <BannerHeader source={{ uri: 'https://example.com/banner.png' }} />
    )

    const image = getByTestId('banner-header-image')
    const flatStyle = Array.isArray(image.props.style)
      ? Object.assign({}, ...image.props.style)
      : image.props.style
    expect(flatStyle.height).toBe(220)
    expect(flatStyle.width).toBe('100%')
  })

  it('pads the wrapper top by the safe area inset so the banner clears the status bar/notch', () => {
    const { getByTestId } = render(
      <BannerHeader source={{ uri: 'https://example.com/banner.png' }} />
    )

    const wrapper = getByTestId('banner-header-wrapper')
    const flatStyle = Array.isArray(wrapper.props.style)
      ? Object.assign({}, ...wrapper.props.style)
      : wrapper.props.style
    expect(flatStyle.paddingTop).toBe(47)
  })
})
