// mobile/lib/quote.test.ts
import { describe, it, expect, jest } from '@jest/globals'
import { validateQuote, submitQuote, type QuoteFormInput, type CartLine } from './quote'

const validForm: QuoteFormInput = {
  name: 'Maria',
  email: 'maria@example.com',
  phone: '',
  eventDate: '',
  message: '',
}
const items: CartLine[] = [{ materialId: '11111111-1111-1111-1111-111111111111', qty: 2 }]

describe('validateQuote', () => {
  it('returns null for a valid input', () => {
    expect(validateQuote(validForm, items)).toBeNull()
  })

  it('rejects an empty name', () => {
    expect(validateQuote({ ...validForm, name: '   ' }, items)).toBe('Nome obrigatório')
  })

  it('rejects an invalid email', () => {
    expect(validateQuote({ ...validForm, email: 'not-an-email' }, items)).toBe('Email inválido')
  })

  it('rejects an empty cart', () => {
    expect(validateQuote(validForm, [])).toBe('Adicione pelo menos um material ao pedido')
  })
})

describe('submitQuote', () => {
  it('calls stock_submit_quote with mapped params and returns success', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: 'req-1', error: null })
    const supabase = { rpc } as never

    const result = await submitQuote(
      supabase,
      { name: 'Maria', email: 'maria@example.com', phone: '', eventDate: '', message: '' },
      items
    )

    expect(rpc).toHaveBeenCalledWith('stock_submit_quote', {
      p_name: 'Maria',
      p_email: 'maria@example.com',
      p_phone: null,
      p_event_date: null,
      p_message: null,
      p_items: [{ materialId: '11111111-1111-1111-1111-111111111111', qty: 2 }],
    })
    expect(result).toEqual({ success: true })
  })

  it('passes optional fields through when present', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: 'req-1', error: null })
    const supabase = { rpc } as never

    await submitQuote(
      supabase,
      { name: 'Maria', email: 'maria@example.com', phone: '912345678', eventDate: '2026-09-01', message: 'olá' },
      items
    )

    expect(rpc).toHaveBeenCalledWith('stock_submit_quote', {
      p_name: 'Maria',
      p_email: 'maria@example.com',
      p_phone: '912345678',
      p_event_date: '2026-09-01',
      p_message: 'olá',
      p_items: items,
    })
  })

  it('maps a rate_limit error to a friendly message', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'rate_limit' } })
    const supabase = { rpc } as never
    const result = await submitQuote(supabase, validForm, items)
    expect(result).toEqual({ success: false, error: 'Demasiados pedidos. Tente novamente mais tarde.' })
  })

  it('maps an invalid_items error to a friendly message', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'invalid_items' } })
    const supabase = { rpc } as never
    const result = await submitQuote(supabase, validForm, items)
    expect(result).toEqual({ success: false, error: 'Pedido inválido.' })
  })

  it('maps any other error to the generic message', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    const supabase = { rpc } as never
    const result = await submitQuote(supabase, validForm, items)
    expect(result).toEqual({ success: false, error: 'Não foi possível submeter o pedido. Tente novamente.' })
  })

  it('never throws when the rpc call rejects', async () => {
    const rpc = jest.fn().mockRejectedValue(new Error('network down'))
    const supabase = { rpc } as never
    const result = await submitQuote(supabase, validForm, items)
    expect(result).toEqual({ success: false, error: 'Não foi possível submeter o pedido. Tente novamente.' })
  })
})
