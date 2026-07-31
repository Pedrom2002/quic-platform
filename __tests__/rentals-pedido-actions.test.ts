import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { QuoteRequestPayload } from '@/app/rentals/pedido/actions'

const { mockCreateClient, mockRpc } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockRpc: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: mockCreateClient }))

const UUID = '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b'

function validPayload(overrides: Partial<QuoteRequestPayload> = {}): QuoteRequestPayload {
  return {
    name: 'Maria Silva',
    email: 'maria@example.com',
    phone: '912345678',
    event_date: '2026-08-15',
    message: 'Preciso de material para um casamento',
    website: '',
    items: [{ materialId: UUID, qty: 2 }],
    ...overrides,
  }
}

beforeEach(() => {
  mockCreateClient.mockReset()
  mockRpc.mockReset()
  mockCreateClient.mockResolvedValue({ rpc: mockRpc })
})

describe('submitQuoteRequest', () => {
  it('submits valid payload and calls stock_submit_quote RPC with expected shape', async () => {
    mockRpc.mockResolvedValue({ error: null })
    const { submitQuoteRequest } = await import('@/app/rentals/pedido/actions')

    const result = await submitQuoteRequest(validPayload())

    expect(result).toEqual({ success: true })
    expect(mockRpc).toHaveBeenCalledWith('stock_submit_quote', {
      p_name: 'Maria Silva',
      p_email: 'maria@example.com',
      p_phone: '912345678',
      p_event_date: '2026-08-15',
      p_message: 'Preciso de material para um casamento',
      p_items: [{ materialId: UUID, qty: 2 }],
    })
  })

  it('submits with optional fields empty, normalizing to null', async () => {
    mockRpc.mockResolvedValue({ error: null })
    const { submitQuoteRequest } = await import('@/app/rentals/pedido/actions')

    await submitQuoteRequest(
      validPayload({ phone: '', event_date: '', message: '' })
    )

    expect(mockRpc).toHaveBeenCalledWith('stock_submit_quote', {
      p_name: 'Maria Silva',
      p_email: 'maria@example.com',
      p_phone: null,
      p_event_date: null,
      p_message: null,
      p_items: [{ materialId: UUID, qty: 2 }],
    })
  })

  it('rejects missing name', async () => {
    const { submitQuoteRequest } = await import('@/app/rentals/pedido/actions')
    const result = await submitQuoteRequest(validPayload({ name: '' }))
    expect(result).toEqual({ success: false, error: 'Nome obrigatório' })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('rejects malformed email', async () => {
    const { submitQuoteRequest } = await import('@/app/rentals/pedido/actions')
    const result = await submitQuoteRequest(validPayload({ email: 'not-an-email' }))
    expect(result).toEqual({ success: false, error: 'Email inválido' })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('rejects empty items array', async () => {
    const { submitQuoteRequest } = await import('@/app/rentals/pedido/actions')
    const result = await submitQuoteRequest(validPayload({ items: [] }))
    expect(result).toEqual({
      success: false,
      error: 'Adicione pelo menos um material ao pedido',
    })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('rejects item with invalid materialId (non-uuid)', async () => {
    const { submitQuoteRequest } = await import('@/app/rentals/pedido/actions')
    const result = await submitQuoteRequest(
      validPayload({ items: [{ materialId: 'not-a-uuid', qty: 1 }] })
    )
    expect(result.success).toBe(false)
    expect((result as { error: string }).error).toContain('Material inválido')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('rejects item with non-positive quantity', async () => {
    const { submitQuoteRequest } = await import('@/app/rentals/pedido/actions')
    const result = await submitQuoteRequest(
      validPayload({ items: [{ materialId: UUID, qty: 0 }] })
    )
    expect(result.success).toBe(false)
    expect((result as { error: string }).error).toContain('Quantidade tem de ser maior que 0')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('rejects malformed event_date', async () => {
    const { submitQuoteRequest } = await import('@/app/rentals/pedido/actions')
    const result = await submitQuoteRequest(validPayload({ event_date: '15-08-2026' }))
    expect(result).toEqual({ success: false, error: 'Data do evento inválida' })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('silently accepts honeypot-filled submissions without hitting the DB', async () => {
    const { submitQuoteRequest } = await import('@/app/rentals/pedido/actions')
    const result = await submitQuoteRequest(validPayload({ website: 'https://bot-spam.example' }))
    expect(result).toEqual({ success: true })
    expect(mockCreateClient).not.toHaveBeenCalled()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('treats whitespace-only honeypot as empty, proceeding to normal validation', async () => {
    mockRpc.mockResolvedValue({ error: null })
    const { submitQuoteRequest } = await import('@/app/rentals/pedido/actions')
    const result = await submitQuoteRequest(validPayload({ website: '   ' }))
    expect(result).toEqual({ success: true })
    expect(mockRpc).toHaveBeenCalled()
  })

  it('maps rate_limit RPC error to friendly message', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'rate_limit exceeded for this ip' } })
    const { submitQuoteRequest } = await import('@/app/rentals/pedido/actions')
    const result = await submitQuoteRequest(validPayload())
    expect(result).toEqual({
      success: false,
      error: 'Demasiados pedidos. Tente novamente mais tarde.',
    })
  })

  it('maps invalid_items RPC error to friendly message', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'invalid_items: material not found' } })
    const { submitQuoteRequest } = await import('@/app/rentals/pedido/actions')
    const result = await submitQuoteRequest(validPayload())
    expect(result).toEqual({ success: false, error: 'Pedido inválido.' })
  })

  it('maps unknown RPC error to generic message', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'unexpected database failure' } })
    const { submitQuoteRequest } = await import('@/app/rentals/pedido/actions')
    const result = await submitQuoteRequest(validPayload())
    expect(result).toEqual({
      success: false,
      error: 'Não foi possível submeter o pedido. Tente novamente.',
    })
  })
})
