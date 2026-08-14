import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUpdate, mockEq, mockCreateClient } = vi.hoisted(() => ({
  mockUpdate: vi.fn(),
  mockEq: vi.fn(),
  mockCreateClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.set(key, value)
  return fd
}

beforeEach(() => {
  mockUpdate.mockReset()
  mockEq.mockReset()
  mockCreateClient.mockReset()
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockCreateClient.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: vi.fn().mockReturnValue({ update: mockUpdate }),
  })
})

describe('updateProfile', () => {
  it('updates full_name and phone, and nothing else, on valid input', async () => {
    mockEq.mockResolvedValue({ error: null })
    const { updateProfile } = await import('@/app/investors/(gated)/profile/actions')

    const result = await updateProfile(makeFormData({ fullName: 'Maria Silva', phone: '912345678' }))

    expect(result).toEqual({})
    expect(mockUpdate).toHaveBeenCalledWith({ full_name: 'Maria Silva', phone: '912345678' })
    expect(mockUpdate.mock.calls[0][0]).not.toHaveProperty('status')
    expect(mockUpdate.mock.calls[0][0]).not.toHaveProperty('organization_id')
    expect(mockUpdate.mock.calls[0][0]).not.toHaveProperty('email')
  })

  it('allows phone to be omitted (optional field)', async () => {
    mockEq.mockResolvedValue({ error: null })
    const { updateProfile } = await import('@/app/investors/(gated)/profile/actions')

    const result = await updateProfile(makeFormData({ fullName: 'Maria Silva' }))

    expect(result).toEqual({})
    expect(mockUpdate).toHaveBeenCalledWith({ full_name: 'Maria Silva', phone: null })
  })

  it('rejects an empty full name', async () => {
    const { updateProfile } = await import('@/app/investors/(gated)/profile/actions')

    const result = await updateProfile(makeFormData({ fullName: '', phone: '912345678' }))

    expect(result.error).toBe('Nome é obrigatório.')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns a generic error when the Supabase update fails', async () => {
    mockEq.mockResolvedValue({ error: { message: 'update failed' } })
    const { updateProfile } = await import('@/app/investors/(gated)/profile/actions')

    const result = await updateProfile(makeFormData({ fullName: 'Maria Silva', phone: '912345678' }))

    expect(result.error).toBe('Não foi possível guardar as alterações. Tenta novamente.')
  })
})
