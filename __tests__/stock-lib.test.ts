import { describe, it, expect } from 'vitest'

import { addItem, removeItem, setQty, totalItems, parseCart, type CartItem } from '@/lib/stock/cart'
import {
  formatDate,
  formatDateTime,
  eventStatusLabels,
  movementTypeLabels,
  quoteStatusLabels,
} from '@/lib/stock/format'
import { buildMailtoHref, type MailtoItem } from '@/lib/stock/mailto'
import {
  quoteRequestSchema,
  categorySchema,
  materialSchema,
  eventSchema,
  movementSchema,
} from '@/lib/stock/validation'
import type { StockQuoteRequest } from '@/lib/stock/types'

const UUID = '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b'

const item = (over: Partial<CartItem> = {}): CartItem => ({
  materialId: 'm1',
  name: 'Coluna',
  unit: 'un',
  qty: 1,
  ...over,
})

describe('stock cart', () => {
  it('addItem adds new material', () => {
    const result = addItem([], item())
    expect(result).toHaveLength(1)
  })

  it('addItem merges quantities for existing material', () => {
    const result = addItem([item({ qty: 2 })], item({ qty: 3 }))
    expect(result).toHaveLength(1)
    expect(result[0].qty).toBe(5)
  })

  it('removeItem removes by materialId', () => {
    const result = removeItem([item(), item({ materialId: 'm2' })], 'm1')
    expect(result.map((i) => i.materialId)).toEqual(['m2'])
  })

  it('setQty clamps to minimum 1 and truncates decimals', () => {
    expect(setQty([item({ qty: 5 })], 'm1', 0)[0].qty).toBe(1)
    expect(setQty([item()], 'm1', 3.9)[0].qty).toBe(3)
    expect(setQty([item()], 'm1', NaN)[0].qty).toBe(1)
  })

  it('totalItems sums quantities', () => {
    expect(totalItems([item({ qty: 2 }), item({ materialId: 'm2', qty: 3 })])).toBe(5)
    expect(totalItems([])).toBe(0)
  })

  it('parseCart handles null, invalid json and non-arrays', () => {
    expect(parseCart(null)).toEqual([])
    expect(parseCart('not-json')).toEqual([])
    expect(parseCart('{"a":1}')).toEqual([])
  })

  it('parseCart filters malformed entries and keeps valid ones', () => {
    const raw = JSON.stringify([
      item(),
      { materialId: 'm2', name: 'X', unit: 'un', qty: 0 },
      { materialId: 'm3', name: 'Y', unit: 'un', qty: 1.5 },
      { materialId: 'm4' },
      null,
    ])
    const result = parseCart(raw)
    expect(result.map((i) => i.materialId)).toEqual(['m1'])
  })
})

describe('stock format', () => {
  it('formatDate returns dash for null and formats date-only strings in UTC', () => {
    expect(formatDate(null)).toBe('-')
    expect(formatDate('2026-07-16')).toMatch(/16\/07\/(20)?26/)
  })

  it('formatDateTime returns a formatted string', () => {
    expect(formatDateTime('2026-07-16T12:00:00Z')).toMatch(/16\/07\/(20)?26/)
  })

  it('label maps cover all states', () => {
    expect(Object.keys(eventStatusLabels)).toHaveLength(3)
    expect(Object.keys(movementTypeLabels)).toHaveLength(4)
    expect(Object.keys(quoteStatusLabels)).toHaveLength(4)
    expect(eventStatusLabels.planeado).toBe('Planeado')
  })
})

describe('stock mailto', () => {
  const request = {
    name: 'João',
    email: 'joao@example.com',
    event_date: '2026-08-01',
  } as unknown as StockQuoteRequest

  const items = [
    { quantity: 2, stock_materials: { name: 'Coluna', unit: 'un' } },
    { quantity: 1, stock_materials: null },
  ] as unknown as MailtoItem[]

  it('builds mailto with encoded email, subject and item lines', () => {
    const href = buildMailtoHref(request, items)
    expect(href.startsWith('mailto:joao%40example.com?')).toBe(true)
    const decoded = decodeURIComponent(href)
    expect(decoded).toContain('2x Coluna')
    expect(decoded).toContain('1x Material removido')
    expect(decoded).toContain('Data do evento:')
  })

  it('omits event date line when missing', () => {
    const noDate = { ...request, event_date: null } as unknown as StockQuoteRequest
    expect(decodeURIComponent(buildMailtoHref(noDate, items))).not.toContain('Data do evento')
  })
})

describe('stock validation', () => {
  it('quoteRequestSchema accepts valid request and rejects empty items', () => {
    const valid = quoteRequestSchema.safeParse({
      name: 'João',
      email: 'joao@example.com',
      items: [{ materialId: UUID, qty: 2 }],
    })
    expect(valid.success).toBe(true)

    const noItems = quoteRequestSchema.safeParse({
      name: 'João',
      email: 'joao@example.com',
      items: [],
    })
    expect(noItems.success).toBe(false)
  })

  it('quoteRequestSchema rejects non-positive quantities and bad email', () => {
    expect(
      quoteRequestSchema.safeParse({
        name: 'X',
        email: 'nope',
        items: [{ materialId: UUID, qty: 1 }],
      }).success
    ).toBe(false)
    expect(
      quoteRequestSchema.safeParse({
        name: 'X',
        email: 'x@example.com',
        items: [{ materialId: UUID, qty: 0 }],
      }).success
    ).toBe(false)
  })

  it('categorySchema coerces sort_order and rejects negatives', () => {
    const ok = categorySchema.safeParse({ name: 'Som', sort_order: '3' })
    expect(ok.success).toBe(true)
    if (ok.success) expect(ok.data.sort_order).toBe(3)
    expect(categorySchema.safeParse({ name: 'Som', sort_order: -1 }).success).toBe(false)
  })

  it('materialSchema defaults unit and requires name', () => {
    const ok = materialSchema.safeParse({
      name: 'Coluna',
      quantity_total: 4,
      is_public: true,
      active: true,
      unit: 'un',
    })
    expect(ok.success).toBe(true)
    expect(
      materialSchema.safeParse({ name: '', quantity_total: 4, is_public: true, active: true })
        .success
    ).toBe(false)
  })

  it('eventSchema rejects end date before start date', () => {
    const bad = eventSchema.safeParse({
      name: 'Evento',
      status: 'planeado',
      starts_on: '2026-08-02',
      ends_on: '2026-08-01',
    })
    expect(bad.success).toBe(false)
    const ok = eventSchema.safeParse({
      name: 'Evento',
      status: 'planeado',
      starts_on: '2026-08-01',
      ends_on: '2026-08-02',
    })
    expect(ok.success).toBe(true)
  })

  it('movementSchema rejects qty 0 and negative for non-ajuste, accepts negative ajuste', () => {
    expect(
      movementSchema.safeParse({ material_id: UUID, type: 'saida', quantity: 0 }).success
    ).toBe(false)
    expect(
      movementSchema.safeParse({ material_id: UUID, type: 'saida', quantity: -2 }).success
    ).toBe(false)
    expect(
      movementSchema.safeParse({ material_id: UUID, type: 'ajuste', quantity: -2 }).success
    ).toBe(true)
  })
})
