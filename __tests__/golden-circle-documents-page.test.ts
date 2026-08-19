import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockCreateClient } = vi.hoisted(() => ({ mockCreateClient: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({ createClient: mockCreateClient }))

function makeSupabase(documents: unknown[]) {
  const docsChain = { order: vi.fn().mockResolvedValue({ data: documents, error: null }) }
  const investorsChain = { eq: vi.fn().mockResolvedValue({ data: [], error: null }) }
  return {
    from: vi.fn((table: string) => {
      if (table === 'investor_documents') return { select: vi.fn().mockReturnValue(docsChain) }
      if (table === 'investors') return { select: vi.fn().mockReturnValue(investorsChain) }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
    }),
  }
}

beforeEach(() => {
  mockCreateClient.mockReset()
})

describe('GoldenCircleDocumentsPage', () => {
  it('renders documents with title and type', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase([
      { id: 'doc-1', title: 'Contrato Maria', type: 'contract', file_url: 'https://blob.example.com/x.pdf', uploaded_at: '2026-08-01T10:00:00Z', investors: { full_name: 'Maria Silva' }, investment_projects: null },
    ]))
    const { default: GoldenCircleDocumentsPage } = await import('@/app/dashboard/golden-circle/documentos/page')

    const result = await GoldenCircleDocumentsPage()
    const html = JSON.stringify(result)

    expect(html).toContain('Contrato Maria')
    expect(html).toContain('Maria Silva')
  })

  it('shows an empty-state message when there are no documents', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase([]))
    const { default: GoldenCircleDocumentsPage } = await import('@/app/dashboard/golden-circle/documentos/page')

    const result = await GoldenCircleDocumentsPage()
    const html = JSON.stringify(result)

    expect(html).toContain('Sem documentos')
  })
})
