// mobile/lib/investorDocuments.test.ts
import { describe, it, expect, jest } from '@jest/globals'
import { fetchInvestorDocuments } from './investorDocuments'

describe('fetchInvestorDocuments', () => {
  function makeSupabase(rows: Array<{
    id: string
    title: string
    type: string
    file_url: string
    uploaded_at: string
  }> | null) {
    const order = jest.fn<() => Promise<{ data: unknown; error: unknown }>>().mockResolvedValue({ data: rows, error: null })
    const select = jest.fn(() => ({ order }))
    const from = jest.fn(() => ({ select }))
    return { supabase: { from } as never, from, select, order }
  }

  it('maps rows to InvestorDocument with camelCase fields', async () => {
    const { supabase } = makeSupabase([
      { id: 'doc-1', title: 'Contrato de Investimento', type: 'contract', file_url: 'https://example.com/contrato.pdf', uploaded_at: '2026-06-01T10:00:00Z' },
    ])

    const documents = await fetchInvestorDocuments(supabase)

    expect(documents).toEqual([
      { id: 'doc-1', title: 'Contrato de Investimento', type: 'contract', fileUrl: 'https://example.com/contrato.pdf', uploadedAt: '2026-06-01T10:00:00Z' },
    ])
  })

  it('returns an empty array when data is null', async () => {
    const { supabase } = makeSupabase(null)

    const documents = await fetchInvestorDocuments(supabase)

    expect(documents).toEqual([])
  })

  it('queries investor_documents ordered by uploaded_at descending', async () => {
    const { supabase, from, select, order } = makeSupabase([])

    await fetchInvestorDocuments(supabase)

    expect(from).toHaveBeenCalledWith('investor_documents')
    expect(select).toHaveBeenCalledWith('id, title, type, file_url, uploaded_at')
    expect(order).toHaveBeenCalledWith('uploaded_at', { ascending: false })
  })
})
