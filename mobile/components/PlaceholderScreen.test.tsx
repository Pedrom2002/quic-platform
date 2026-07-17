import { describe, it, expect } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { PlaceholderScreen } from './PlaceholderScreen'

describe('PlaceholderScreen', () => {
  it('renders title and message', () => {
    const { getByText } = render(<PlaceholderScreen title="Início" message="Em breve" />)
    expect(getByText('INÍCIO')).toBeTruthy()
    expect(getByText('Em breve')).toBeTruthy()
  })
})
