import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockCreateClient } = vi.hoisted(() => ({ mockCreateClient: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({ createClient: mockCreateClient }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    ({ type: 'a', props: { href, ...props, children } }),
}))

// The page does `query = query.order(...)` then optionally `query = query.eq('type', type)`
// before `await query`, so the object returned by `.order()` must both be awaitable
// (thenable) and expose `.eq()` returning another awaitable-with-`.eq` shape.
function makeAwaitableChain(documents: unknown[], eqSpy: ReturnType<typeof vi.fn>) {
  return {
    then: (resolve: (value: { data: unknown[]; error: null }) => void) =>
      resolve({ data: documents, error: null }),
    eq: eqSpy,
  }
}

function makeSupabase(documents: unknown[]) {
  const eqSpy = vi.fn()
  const chain = makeAwaitableChain(documents, eqSpy)
  eqSpy.mockReturnValue(chain)
  const docsChain = { order: vi.fn().mockReturnValue(chain) }
  const investorsChain = { eq: vi.fn().mockResolvedValue({ data: [], error: null }) }
  return {
    from: vi.fn((table: string) => {
      if (table === 'investor_documents') return { select: vi.fn().mockReturnValue(docsChain) }
      if (table === 'investors') return { select: vi.fn().mockReturnValue(investorsChain) }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
    }),
    eqSpy,
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

    const result = await GoldenCircleDocumentsPage({ searchParams: Promise.resolve({}) })
    const html = JSON.stringify(result)

    expect(html).toContain('Contrato Maria')
    expect(html).toContain('Maria Silva')
  })

  it('shows an empty-state message when there are no documents', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase([]))
    const { default: GoldenCircleDocumentsPage } = await import('@/app/dashboard/golden-circle/documentos/page')

    const result = await GoldenCircleDocumentsPage({ searchParams: Promise.resolve({}) })
    const html = JSON.stringify(result)

    expect(html).toContain('Sem documentos')
  })

  it('filters by type when searchParams has a type', async () => {
    const supabase = makeSupabase([])
    mockCreateClient.mockResolvedValue(supabase)
    const { default: GoldenCircleDocumentsPage } = await import('@/app/dashboard/golden-circle/documentos/page')

    await GoldenCircleDocumentsPage({ searchParams: Promise.resolve({ type: 'contract' }) })

    expect(supabase.eqSpy).toHaveBeenCalledWith('type', 'contract')
  })
})
