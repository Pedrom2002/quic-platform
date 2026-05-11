import { describe, it, expect } from 'vitest'
import { createEventSchema, updateEventSchema } from '@/schemas/event.schema'

const validBase = {
  name: 'Concerto de Jazz',
  event_type_id: 'type-1',
  start_datetime: '2026-06-15T20:00',
  end_datetime: '2026-06-15T23:00',
}

describe('createEventSchema', () => {
  it('accepts valid input', () => {
    expect(createEventSchema.safeParse(validBase).success).toBe(true)
  })

  it('rejects name shorter than 3 chars', () => {
    expect(createEventSchema.safeParse({ ...validBase, name: 'AB' }).success).toBe(false)
  })

  it('rejects missing event_type_id', () => {
    expect(createEventSchema.safeParse({ ...validBase, event_type_id: '' }).success).toBe(false)
  })

  it('rejects invalid start_datetime string', () => {
    expect(createEventSchema.safeParse({ ...validBase, start_datetime: 'not-a-date' }).success).toBe(false)
  })

  it('rejects invalid end_datetime string', () => {
    expect(createEventSchema.safeParse({ ...validBase, end_datetime: 'not-a-date' }).success).toBe(false)
  })

  it('rejects end_datetime before start_datetime', () => {
    const result = createEventSchema.safeParse({
      ...validBase,
      start_datetime: '2026-06-15T23:00',
      end_datetime: '2026-06-15T20:00',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('end_datetime'))).toBe(true)
    }
  })

  it('rejects end_datetime equal to start_datetime', () => {
    expect(createEventSchema.safeParse({
      ...validBase,
      start_datetime: '2026-06-15T20:00',
      end_datetime: '2026-06-15T20:00',
    }).success).toBe(false)
  })

  it('accepts optional fields', () => {
    expect(createEventSchema.safeParse({
      ...validBase, description: 'Desc', venue_name: 'Sala', venue_address: 'Rua 1',
    }).success).toBe(true)
  })
})

describe('updateEventSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    expect(updateEventSchema.safeParse({}).success).toBe(true)
  })

  it('accepts valid status values', () => {
    for (const status of ['planning', 'active', 'completed', 'cancelled']) {
      expect(updateEventSchema.safeParse({ status }).success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    expect(updateEventSchema.safeParse({ status: 'archived' }).success).toBe(false)
  })

  it('accepts partial name update', () => {
    expect(updateEventSchema.safeParse({ name: 'Novo Nome' }).success).toBe(true)
  })
})
