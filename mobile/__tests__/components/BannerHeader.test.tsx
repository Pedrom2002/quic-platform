import { describe, it, expect } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { BannerHeader } from '../../components/BannerHeader'

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
})
