import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { Linking, ActivityIndicator } from 'react-native'
import { DocumentsTab } from '../../components/DocumentsTab'

const mockFetchInvestorDocuments = jest.fn<(...args: unknown[]) => Promise<unknown>>()

jest.mock('../../lib/supabase', () => ({ supabase: {} }))
jest.mock('../../lib/investorDocuments', () => ({
  fetchInvestorDocuments: (...args: unknown[]) => mockFetchInvestorDocuments(...args),
}))

const mockOpenURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never)

describe('DocumentsTab', () => {
  beforeEach(() => {
    mockFetchInvestorDocuments.mockReset()
    mockOpenURL.mockReset()
    mockOpenURL.mockResolvedValue(true as never)
  })

  it('shows a loading indicator while the fetch is pending', async () => {
    mockFetchInvestorDocuments.mockReturnValue(new Promise(() => {}))

    const { UNSAFE_getByType, unmount } = render(<DocumentsTab />)

    await waitFor(() => expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy())

    unmount()
  })

  it('shows the empty state when there are no documents', async () => {
    mockFetchInvestorDocuments.mockResolvedValue([])

    const { findByText } = render(<DocumentsTab />)

    expect(await findByText('Ainda não tens documentos disponíveis.')).toBeTruthy()
  })

  it('shows the singular counter for exactly one document', async () => {
    mockFetchInvestorDocuments.mockResolvedValue([
      { id: 'doc-1', title: 'Contrato de Investimento', type: 'contract', fileUrl: 'https://example.com/a.pdf', uploadedAt: '2026-06-01T10:00:00Z' },
    ])

    const { findByText } = render(<DocumentsTab />)

    expect(await findByText('1 documento disponível')).toBeTruthy()
  })

  it('shows the plural counter, type badge, and formatted date for multiple documents', async () => {
    mockFetchInvestorDocuments.mockResolvedValue([
      { id: 'doc-1', title: 'Contrato de Investimento', type: 'contract', fileUrl: 'https://example.com/a.pdf', uploadedAt: '2026-06-01T10:00:00Z' },
      { id: 'doc-2', title: 'Relatório Trimestral', type: 'report', fileUrl: 'https://example.com/b.pdf', uploadedAt: '2026-07-15T10:00:00Z' },
    ])

    const { findByText } = render(<DocumentsTab />)

    expect(await findByText('2 documentos disponíveis')).toBeTruthy()
    expect(await findByText('Contrato de Investimento')).toBeTruthy()
    expect(await findByText('Contrato')).toBeTruthy()
    expect(await findByText('01/06/2026')).toBeTruthy()
    expect(await findByText('Relatório')).toBeTruthy()
    expect(await findByText('15/07/2026')).toBeTruthy()
  })

  it('falls back to the raw type value for an unknown document type', async () => {
    mockFetchInvestorDocuments.mockResolvedValue([
      { id: 'doc-1', title: 'Documento Especial', type: 'custom_type', fileUrl: 'https://example.com/c.pdf', uploadedAt: '2026-06-01T10:00:00Z' },
    ])

    const { findByText } = render(<DocumentsTab />)

    expect(await findByText('custom_type')).toBeTruthy()
  })

  it('calls Linking.openURL with the document fileUrl when Descarregar is pressed', async () => {
    mockFetchInvestorDocuments.mockResolvedValue([
      { id: 'doc-1', title: 'Contrato de Investimento', type: 'contract', fileUrl: 'https://example.com/contrato.pdf', uploadedAt: '2026-06-01T10:00:00Z' },
    ])

    const { findByText, getByText } = render(<DocumentsTab />)
    await findByText('Contrato de Investimento')

    fireEvent.press(getByText('Descarregar'))

    expect(mockOpenURL).toHaveBeenCalledWith('https://example.com/contrato.pdf')
  })

  it('shows an error message when the fetch rejects', async () => {
    mockFetchInvestorDocuments.mockRejectedValue(new Error('network error'))

    const { findByText } = render(<DocumentsTab />)

    expect(await findByText('Não foi possível carregar os teus documentos. Tenta novamente mais tarde.')).toBeTruthy()
  })

  it('does not update state after unmount', async () => {
    let resolveFetch: (value: unknown[]) => void = () => {}
    mockFetchInvestorDocuments.mockReturnValue(
      new Promise(resolve => { resolveFetch = resolve })
    )

    const { UNSAFE_getByType, unmount } = render(<DocumentsTab />)
    await waitFor(() => expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy())

    unmount()
    resolveFetch([{ id: 'doc-1', title: 'X', type: 'contract', fileUrl: 'https://example.com/x.pdf', uploadedAt: '2026-06-01T10:00:00Z' }])
  })
})
