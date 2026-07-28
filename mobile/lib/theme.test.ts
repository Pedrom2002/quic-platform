import { describe, it, expect } from '@jest/globals'
import { QUIC_MAGENTA } from './theme'

describe('QUIC_MAGENTA', () => {
  it('é a cor magenta da marca QUIC', () => {
    expect(QUIC_MAGENTA).toBe('#951b81')
  })
})
