import { describe, it, expect } from 'vitest'
import { isContactVisibleToMember } from '@/lib/contacts/visibility'

describe('isContactVisibleToMember', () => {
  it('returns true when contact has no groups', () => {
    expect(isContactVisibleToMember([])).toBe(true)
  })

  it('returns true when contact has at least one non-admin group', () => {
    expect(isContactVisibleToMember([
      { admin_only: true },
      { admin_only: false },
    ])).toBe(true)
  })

  it('returns false when contact is only in admin groups', () => {
    expect(isContactVisibleToMember([
      { admin_only: true },
    ])).toBe(false)
  })
})
