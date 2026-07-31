import { describe, it, expect } from '@jest/globals'
import { displayArtistName } from './artistName'

describe('displayArtistName', () => {
  it('remove sufixo entre parenteses', () => {
    expect(displayArtistName('Andrea Soares (Banda X)')).toBe('Andrea Soares')
  })

  it('remove parenteses no meio do nome', () => {
    expect(displayArtistName('Andrea (Andy) Soares')).toBe('Andrea Soares')
  })

  it('devolve o nome tal como esta quando nao tem parenteses', () => {
    expect(displayArtistName('Andrea Soares')).toBe('Andrea Soares')
  })

  it('remove multiplos grupos de parenteses', () => {
    expect(displayArtistName('Andrea Soares (Banda X) (PT)')).toBe('Andrea Soares')
  })
})
