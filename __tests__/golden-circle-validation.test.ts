import { describe, it, expect } from 'vitest'
import { projectSchema, investmentSchema, documentSchema } from '@/lib/golden-circle/validation'

describe('projectSchema', () => {
  it('accepts a valid project', () => {
    const result = projectSchema.safeParse({
      name: 'Arena Live Lisboa',
      description: 'Concerto ao ar livre',
      status: 'coming_soon',
      funding_goal_cents: 500000,
      capacity: 1000,
      investment_deadline: '2026-12-31',
      actual_revenue_cents: null,
      attendance: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = projectSchema.safeParse({
      name: '  ',
      status: 'coming_soon',
      funding_goal_cents: 500000,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative funding_goal_cents', () => {
    const result = projectSchema.safeParse({
      name: 'Projeto',
      status: 'coming_soon',
      funding_goal_cents: -100,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid status', () => {
    const result = projectSchema.safeParse({
      name: 'Projeto',
      status: 'invalid_status',
      funding_goal_cents: 500000,
    })
    expect(result.success).toBe(false)
  })
})

describe('investmentSchema', () => {
  it('accepts a valid investment', () => {
    const result = investmentSchema.safeParse({
      investor_id: '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b',
      amount_cents: 100000,
      invested_at: '2026-08-19',
      projected_return_cents: 15000,
    })
    expect(result.success).toBe(true)
  })

  it('rejects zero or negative amount_cents', () => {
    const result = investmentSchema.safeParse({
      investor_id: '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b',
      amount_cents: 0,
      invested_at: '2026-08-19',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid investor_id', () => {
    const result = investmentSchema.safeParse({
      investor_id: 'not-a-uuid',
      amount_cents: 100000,
      invested_at: '2026-08-19',
    })
    expect(result.success).toBe(false)
  })
})

describe('documentSchema', () => {
  it('accepts a document linked to an investor', () => {
    const result = documentSchema.safeParse({
      title: 'Contrato',
      type: 'contract',
      investor_id: '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b',
      project_id: null,
    })
    expect(result.success).toBe(true)
  })

  it('accepts a document linked to a project', () => {
    const result = documentSchema.safeParse({
      title: 'Relatório',
      type: 'report',
      investor_id: null,
      project_id: '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b',
    })
    expect(result.success).toBe(true)
  })

  it('rejects when neither investor_id nor project_id is set', () => {
    const result = documentSchema.safeParse({
      title: 'Doc',
      type: 'contract',
      investor_id: null,
      project_id: null,
    })
    expect(result.success).toBe(false)
  })

  it('rejects when both investor_id and project_id are set', () => {
    const result = documentSchema.safeParse({
      title: 'Doc',
      type: 'contract',
      investor_id: '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b',
      project_id: '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid type', () => {
    const result = documentSchema.safeParse({
      title: 'Doc',
      type: 'invalid',
      investor_id: '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b',
      project_id: null,
    })
    expect(result.success).toBe(false)
  })
})
