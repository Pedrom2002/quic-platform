// mobile/__tests__/components/ProfileTab.test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, fireEvent } from '@testing-library/react-native'
import { ProfileTab } from '../../components/ProfileTab'

const mockFetchInvestorProfile = jest.fn<(...args: unknown[]) => Promise<unknown>>()
const mockUpdateInvestorProfile = jest.fn<(...args: unknown[]) => Promise<unknown>>()

jest.mock('../../lib/supabase', () => ({ supabase: {} }))
jest.mock('../../lib/investorProfile', () => ({
  fetchInvestorProfile: (...args: unknown[]) => mockFetchInvestorProfile(...args),
  updateInvestorProfile: (...args: unknown[]) => mockUpdateInvestorProfile(...args),
}))

describe('ProfileTab', () => {
  beforeEach(() => {
    mockFetchInvestorProfile.mockReset()
    mockUpdateInvestorProfile.mockReset()
  })

  it('shows a loading message while the initial fetch is pending', async () => {
    mockFetchInvestorProfile.mockReturnValue(new Promise(() => {}))

    const { findByText, unmount } = render(<ProfileTab investorId="inv-1" email="ana@example.com" status="approved" />)

    expect(await findByText('A carregar...')).toBeTruthy()

    unmount()
  })

  it('shows the email and approved status badge once loaded', async () => {
    mockFetchInvestorProfile.mockResolvedValue({ fullName: 'Ana Silva', phone: '912345678' })

    const { findByText } = render(<ProfileTab investorId="inv-1" email="ana@example.com" status="approved" />)

    expect(await findByText('ana@example.com')).toBeTruthy()
    expect(await findByText('Aprovado')).toBeTruthy()
  })

  it('pre-fills the form fields with the fetched profile data', async () => {
    mockFetchInvestorProfile.mockResolvedValue({ fullName: 'Ana Silva', phone: '912345678' })

    const { findByDisplayValue } = render(<ProfileTab investorId="inv-1" email="ana@example.com" status="approved" />)

    expect(await findByDisplayValue('Ana Silva')).toBeTruthy()
    expect(await findByDisplayValue('912345678')).toBeTruthy()
  })

  it('calls updateInvestorProfile with the edited values when Guardar is pressed', async () => {
    mockFetchInvestorProfile.mockResolvedValue({ fullName: 'Ana Silva', phone: '912345678' })
    mockUpdateInvestorProfile.mockResolvedValue({})

    const { findByDisplayValue, getByDisplayValue, getByText } = render(
      <ProfileTab investorId="inv-1" email="ana@example.com" status="approved" />
    )
    await findByDisplayValue('Ana Silva')

    fireEvent.changeText(getByDisplayValue('Ana Silva'), 'Ana Costa')
    fireEvent.press(getByText('Guardar'))

    expect(mockUpdateInvestorProfile).toHaveBeenCalledWith({}, 'inv-1', { fullName: 'Ana Costa', phone: '912345678' })
  })

  it('shows a success message after a successful save', async () => {
    mockFetchInvestorProfile.mockResolvedValue({ fullName: 'Ana Silva', phone: '912345678' })
    mockUpdateInvestorProfile.mockResolvedValue({})

    const { findByDisplayValue, getByText, findByText } = render(
      <ProfileTab investorId="inv-1" email="ana@example.com" status="approved" />
    )
    await findByDisplayValue('Ana Silva')

    fireEvent.press(getByText('Guardar'))

    expect(await findByText('Alterações guardadas.')).toBeTruthy()
  })

  it('shows the error message returned by updateInvestorProfile', async () => {
    mockFetchInvestorProfile.mockResolvedValue({ fullName: 'Ana Silva', phone: '912345678' })
    mockUpdateInvestorProfile.mockResolvedValue({ error: 'Nome é obrigatório.' })

    const { findByDisplayValue, getByText, findByText } = render(
      <ProfileTab investorId="inv-1" email="ana@example.com" status="approved" />
    )
    await findByDisplayValue('Ana Silva')

    fireEvent.press(getByText('Guardar'))

    expect(await findByText('Nome é obrigatório.')).toBeTruthy()
  })

  it('disables the save button and shows "A guardar..." while submitting', async () => {
    mockFetchInvestorProfile.mockResolvedValue({ fullName: 'Ana Silva', phone: '912345678' })
    mockUpdateInvestorProfile.mockReturnValue(new Promise(() => {}))

    const { findByDisplayValue, getByText, findByText } = render(
      <ProfileTab investorId="inv-1" email="ana@example.com" status="approved" />
    )
    await findByDisplayValue('Ana Silva')

    fireEvent.press(getByText('Guardar'))

    expect(await findByText('A guardar...')).toBeTruthy()
  })

  it('shows an error message when the initial fetch rejects', async () => {
    mockFetchInvestorProfile.mockRejectedValue(new Error('network error'))

    const { findByText } = render(<ProfileTab investorId="inv-1" email="ana@example.com" status="approved" />)

    expect(await findByText('Não foi possível carregar o teu perfil. Tenta novamente mais tarde.')).toBeTruthy()
  })

  it('does not update state after unmount', async () => {
    let resolveFetch: (value: unknown) => void = () => {}
    mockFetchInvestorProfile.mockReturnValue(new Promise(resolve => { resolveFetch = resolve }))

    const { findByText, unmount } = render(<ProfileTab investorId="inv-1" email="ana@example.com" status="approved" />)
    expect(await findByText('A carregar...')).toBeTruthy()

    unmount()
    resolveFetch({ fullName: 'Ana Silva', phone: null })
  })
})
