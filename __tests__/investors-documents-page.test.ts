import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockOrder, mockSelect, mockCreateClient } = vi.hoisted(() => ({
  mockOrder: vi.fn(),
  mockSelect: vi.fn(),
  mockCreateClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

beforeEach(() => {
  mockOrder.mockReset()
  mockSelect.mockReset()
  mockCreateClient.mockReset()
  mockSelect.mockReturnValue({ order: mockOrder })
  mockCreateClient.mockResolvedValue({
    from: vi.fn().mockReturnValue({ select: mockSelect }),
  })
})

describe('InvestorDocumentsPage', () => {
  it('renders documents ordered by uploaded_at descending, with formatted date and download link', async () => {
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'doc-1',
          title: 'Contrato de Investimento 2026',
          type: 'contract',
          file_url: 'https://blob.example.com/doc-1.pdf',
          uploaded_at: '2026-06-15T10:00:00Z',
        },
        {
          id: 'doc-2',
          title: 'Relatório Anual 2025',
          type: 'report',
          file_url: 'https://blob.example.com/doc-2.pdf',
          uploaded_at: '2025-01-10T10:00:00Z',
        },
      ],
      error: null,
    })
    const { default: InvestorDocumentsPage } = await import('@/app/investors/(gated)/documents/page')

    const result = await InvestorDocumentsPage()
    const html = JSON.stringify(result)

    expect(mockSelect).toHaveBeenCalledWith('id, title, type, file_url, uploaded_at')
    expect(mockOrder).toHaveBeenCalledWith('uploaded_at', { ascending: false })
    expect(html).toContain('Contrato de Investimento 2026')
    expect(html).toContain('Relatório Anual 2025')
    expect(html).toContain('15/06/2026')
    expect(html).toContain('10/01/2025')
    expect(html).toContain('https://blob.example.com/doc-1.pdf')
    expect(html).toContain('https://blob.example.com/doc-2.pdf')
  })

  it('shows an empty-state message when there are no documents', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })
    const { default: InvestorDocumentsPage } = await import('@/app/investors/(gated)/documents/page')

    const result = await InvestorDocumentsPage()
    const html = JSON.stringify(result)

    expect(html).toContain('Ainda não tens documentos disponíveis.')
  })

  it('shows an empty-state message when the query returns null data', async () => {
    mockOrder.mockResolvedValue({ data: null, error: null })
    const { default: InvestorDocumentsPage } = await import('@/app/investors/(gated)/documents/page')

    const result = await InvestorDocumentsPage()
    const html = JSON.stringify(result)

    expect(html).toContain('Ainda não tens documentos disponíveis.')
  })

  it('renders distinct type labels and classes for contract, report, tax and presentation', async () => {
    mockOrder.mockResolvedValue({
      data: [
        { id: 'doc-1', title: 'Doc A', type: 'contract', file_url: 'https://x/1.pdf', uploaded_at: '2026-01-01T00:00:00Z' },
        { id: 'doc-2', title: 'Doc B', type: 'report', file_url: 'https://x/2.pdf', uploaded_at: '2026-01-01T00:00:00Z' },
        { id: 'doc-3', title: 'Doc C', type: 'tax', file_url: 'https://x/3.pdf', uploaded_at: '2026-01-01T00:00:00Z' },
        { id: 'doc-4', title: 'Doc D', type: 'presentation', file_url: 'https://x/4.pdf', uploaded_at: '2026-01-01T00:00:00Z' },
      ],
      error: null,
    })
    const { default: InvestorDocumentsPage } = await import('@/app/investors/(gated)/documents/page')

    const result = await InvestorDocumentsPage()
    const html = JSON.stringify(result)

    expect(html).toContain('Contrato')
    expect(html).toContain('text-sky-400')
    expect(html).toContain('Relatório')
    expect(html).toContain('text-emerald-400')
    expect(html).toContain('Fiscal')
    expect(html).toContain('text-amber-400')
    expect(html).toContain('Apresentação')
    expect(html).toContain('text-violet-400')
  })

  it('falls back to the raw type and neutral classes for an unmapped type', async () => {
    mockOrder.mockResolvedValue({
      data: [
        { id: 'doc-1', title: 'Doc Estranho', type: 'legal_notice', file_url: 'https://x/1.pdf', uploaded_at: '2026-01-01T00:00:00Z' },
      ],
      error: null,
    })
    const { default: InvestorDocumentsPage } = await import('@/app/investors/(gated)/documents/page')

    const result = await InvestorDocumentsPage()
    const html = JSON.stringify(result)

    expect(html).toContain('legal_notice')
    expect(html).toContain('text-zinc-400')
  })
})
