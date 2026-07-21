jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'))
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'))

import { describe, it, expect } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { MaterialCardSkeleton } from './MaterialCardSkeleton'

describe('MaterialCardSkeleton', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<MaterialCardSkeleton />)
    expect(getByTestId('material-card-skeleton')).toBeTruthy()
  })
})
