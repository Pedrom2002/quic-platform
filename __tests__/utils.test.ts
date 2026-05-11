import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it('merges class strings', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('resolves tailwind conflicts (last wins)', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8')
  })

  it('ignores falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b')
  })

  it('handles empty call', () => {
    expect(cn()).toBe('')
  })

  it('handles conditional object syntax', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500')
  })
})
