// mobile/lib/investorProfile.test.ts
import { describe, it, expect, jest } from '@jest/globals'
import { fetchInvestorProfile, updateInvestorProfile } from './investorProfile'

describe('fetchInvestorProfile', () => {
  function makeFetchSupabase(row: { full_name: string; phone: string | null } | null) {
    const single = jest.fn<() => Promise<{ data: unknown; error: unknown }>>().mockResolvedValue({ data: row, error: null })
    const eq = jest.fn(() => ({ single }))
    const select = jest.fn(() => ({ eq }))
    const from = jest.fn(() => ({ select }))
    return { supabase: { from } as never, from, select, eq }
  }

  it('maps full_name to fullName and keeps phone as-is', async () => {
    const { supabase } = makeFetchSupabase({ full_name: 'Ana Silva', phone: '912345678' })

    const profile = await fetchInvestorProfile(supabase, 'investor-1')

    expect(profile).toEqual({ fullName: 'Ana Silva', phone: '912345678' })
  })

  it('returns an empty profile when data is null', async () => {
    const { supabase } = makeFetchSupabase(null)

    const profile = await fetchInvestorProfile(supabase, 'investor-1')

    expect(profile).toEqual({ fullName: '', phone: null })
  })

  it('queries investors filtered by id, selecting full_name and phone', async () => {
    const { supabase, from, select, eq } = makeFetchSupabase({ full_name: '', phone: null })

    await fetchInvestorProfile(supabase, 'investor-42')

    expect(from).toHaveBeenCalledWith('investors')
    expect(select).toHaveBeenCalledWith('full_name, phone')
    expect(eq).toHaveBeenCalledWith('id', 'investor-42')
  })
})

describe('updateInvestorProfile', () => {
  function makeUpdateSupabase(result: { data: unknown; error: unknown }) {
    const select = jest.fn<() => Promise<{ data: unknown; error: unknown }>>().mockResolvedValue(result)
    const eq = jest.fn(() => ({ select }))
    const update = jest.fn(() => ({ eq }))
    const from = jest.fn(() => ({ update }))
    return { supabase: { from } as never, from, update, eq, select }
  }

  it('rejects an empty full name without calling supabase', async () => {
    const { supabase, from } = makeUpdateSupabase({ data: [{ id: 'investor-1' }], error: null })

    const result = await updateInvestorProfile(supabase, 'investor-1', { fullName: '   ', phone: null })

    expect(result).toEqual({ error: 'Nome é obrigatório.' })
    expect(from).not.toHaveBeenCalled()
  })

  it('updates full_name and phone, filtered by id, on success', async () => {
    const { supabase, from, update, eq } = makeUpdateSupabase({ data: [{ id: 'investor-1' }], error: null })

    const result = await updateInvestorProfile(supabase, 'investor-1', { fullName: 'Ana Silva', phone: '912345678' })

    expect(result).toEqual({})
    expect(from).toHaveBeenCalledWith('investors')
    expect(update).toHaveBeenCalledWith({ full_name: 'Ana Silva', phone: '912345678' })
    expect(eq).toHaveBeenCalledWith('id', 'investor-1')
  })

  it('returns an error when the query fails', async () => {
    const { supabase } = makeUpdateSupabase({ data: null, error: { message: 'db error' } })

    const result = await updateInvestorProfile(supabase, 'investor-1', { fullName: 'Ana Silva', phone: null })

    expect(result).toEqual({ error: 'Não foi possível guardar as alterações. Tenta novamente.' })
  })

  it('returns an error when no row was affected', async () => {
    const { supabase } = makeUpdateSupabase({ data: [], error: null })

    const result = await updateInvestorProfile(supabase, 'investor-1', { fullName: 'Ana Silva', phone: null })

    expect(result).toEqual({ error: 'Não foi possível guardar as alterações. Tenta novamente.' })
  })
})
