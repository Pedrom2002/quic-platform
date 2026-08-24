import { describe, it, expect, jest } from '@jest/globals'
import { applyForGoldenCircle } from './goldenCircleApply'

describe('applyForGoldenCircle', () => {
  it('rejects an empty full name without hitting the network', async () => {
    const insert = jest.fn()
    const supabase = { from: jest.fn(() => ({ insert })) } as never

    const result = await applyForGoldenCircle(supabase, 'user-1', { fullName: '  ', email: 'a@a.com', phone: null })

    expect(result.error).toBe('Nome é obrigatório.')
    expect(insert).not.toHaveBeenCalled()
  })

  it('inserts a pending investor row for the current auth user', async () => {
    const insert = jest.fn<() => Promise<{ error: null }>>().mockResolvedValue({ error: null })
    const from = jest.fn(() => ({ insert }))
    const supabase = { from } as never

    const result = await applyForGoldenCircle(supabase, 'user-1', { fullName: 'Ana Silva', email: 'ana@example.com', phone: '912345678' })

    expect(result.error).toBeUndefined()
    expect(from).toHaveBeenCalledWith('investors')
    expect(insert).toHaveBeenCalledWith({
      auth_user_id: 'user-1',
      organization_id: '00000000-0000-0000-0000-000000000001',
      full_name: 'Ana Silva',
      email: 'ana@example.com',
      phone: '912345678',
      status: 'pending',
    })
  })

  it('returns a friendly error when the insert fails', async () => {
    const insert = jest.fn<() => Promise<{ error: { message: string } }>>().mockResolvedValue({ error: { message: 'boom' } })
    const supabase = { from: jest.fn(() => ({ insert })) } as never

    const result = await applyForGoldenCircle(supabase, 'user-1', { fullName: 'Ana Silva', email: 'ana@example.com', phone: null })

    expect(result.error).toBe('Não foi possível submeter o pedido. Tenta novamente mais tarde.')
  })
})
