import { describe, it, expect } from 'vitest'
import { EVENT_STATUS_LABEL, EVENT_STATUS_COLOR, calcProgress } from '@/lib/event-status'

describe('EVENT_STATUS_LABEL', () => {
  const statuses = ['planning', 'active', 'completed', 'cancelled']

  it('has a label for every known status', () => {
    for (const s of statuses) {
      expect(EVENT_STATUS_LABEL[s]).toBeTypeOf('string')
      expect(EVENT_STATUS_LABEL[s].length).toBeGreaterThan(0)
    }
  })
})

describe('EVENT_STATUS_COLOR', () => {
  const statuses = ['planning', 'active', 'completed', 'cancelled']

  it('has a color class string for every known status', () => {
    for (const s of statuses) {
      expect(EVENT_STATUS_COLOR[s]).toBeTypeOf('string')
      expect(EVENT_STATUS_COLOR[s].length).toBeGreaterThan(0)
    }
  })
})

describe('calcProgress', () => {
  it('returns 0 when total is 0', () => {
    expect(calcProgress(0, 0)).toBe(0)
  })

  it('returns 0 when nothing is completed', () => {
    expect(calcProgress(0, 10)).toBe(0)
  })

  it('returns 100 when all items are completed', () => {
    expect(calcProgress(10, 10)).toBe(100)
  })

  it('rounds to nearest integer', () => {
    expect(calcProgress(1, 3)).toBe(33)
    expect(calcProgress(2, 3)).toBe(67)
  })

  it('returns 50 for half completion', () => {
    expect(calcProgress(5, 10)).toBe(50)
  })
})
