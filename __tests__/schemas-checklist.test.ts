import { describe, it, expect } from 'vitest'
import { createChecklistItemSchema, updateChecklistItemSchema } from '@/schemas/checklist.schema'

describe('createChecklistItemSchema', () => {
  it('accepts valid input', () => {
    expect(createChecklistItemSchema.safeParse({ title: 'Tarefa', position: 1 }).success).toBe(true)
  })

  it('rejects empty title', () => {
    expect(createChecklistItemSchema.safeParse({ title: '', position: 1 }).success).toBe(false)
  })

  it('rejects position of 0', () => {
    expect(createChecklistItemSchema.safeParse({ title: 'T', position: 0 }).success).toBe(false)
  })

  it('rejects negative position', () => {
    expect(createChecklistItemSchema.safeParse({ title: 'T', position: -1 }).success).toBe(false)
  })

  it('defaults is_client_visible to true', () => {
    const result = createChecklistItemSchema.safeParse({ title: 'T', position: 1 })
    if (result.success) expect(result.data.is_client_visible).toBe(true)
  })

  it('accepts all optional fields', () => {
    expect(createChecklistItemSchema.safeParse({
      title: 'T', position: 1, client_label: 'Label', description: 'Desc', is_client_visible: false,
    }).success).toBe(true)
  })
})

describe('updateChecklistItemSchema', () => {
  it('accepts empty object', () => {
    expect(updateChecklistItemSchema.safeParse({}).success).toBe(true)
  })

  it('accepts all valid status values', () => {
    for (const status of ['pending', 'in_progress', 'completed', 'skipped']) {
      expect(updateChecklistItemSchema.safeParse({ status }).success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    expect(updateChecklistItemSchema.safeParse({ status: 'done' }).success).toBe(false)
  })

  it('rejects invalid uuid for assigned_to', () => {
    expect(updateChecklistItemSchema.safeParse({ assigned_to: 'not-uuid' }).success).toBe(false)
  })

  it('accepts null for assigned_to', () => {
    expect(updateChecklistItemSchema.safeParse({ assigned_to: null }).success).toBe(true)
  })

  it('accepts valid uuid for assigned_to', () => {
    expect(updateChecklistItemSchema.safeParse({ assigned_to: '123e4567-e89b-12d3-a456-426614174000' }).success).toBe(true)
  })

  it('accepts null for due_at', () => {
    expect(updateChecklistItemSchema.safeParse({ due_at: null }).success).toBe(true)
  })
})
