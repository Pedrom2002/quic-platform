// @vitest-environment jsdom
// __tests__/route-reset-password-page.test.tsx
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'

const { mockGetSession, mockUpdateUser, mockCreateClient, mockSearchParamsGet } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockCreateClient: vi.fn(),
  mockSearchParamsGet: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: mockCreateClient,
}))
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: mockSearchParamsGet }),
}))

import ResetPasswordPage from '@/app/reset-password/page'

afterEach(cleanup)

beforeEach(() => {
  mockGetSession.mockReset()
  mockUpdateUser.mockReset()
  mockCreateClient.mockReset()
  mockSearchParamsGet.mockReset()
  mockSearchParamsGet.mockReturnValue(null)
  mockCreateClient.mockReturnValue({
    auth: {
      getSession: mockGetSession,
      updateUser: mockUpdateUser,
    },
  })
})

describe('ResetPasswordPage', () => {
  it('shows the expired-link message when there is no active session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    render(<ResetPasswordPage />)

    await waitFor(() => {
      expect(screen.getByText(/link expirou ou já foi usado/i)).toBeInTheDocument()
    })
    expect(screen.queryByLabelText(/nova password/i)).not.toBeInTheDocument()
  })

  it('blocks submit when passwords do not match', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } })

    render(<ResetPasswordPage />)
    await waitFor(() => expect(screen.getByLabelText(/^nova password/i)).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/^nova password/i), { target: { value: 'abcdef' } })
    fireEvent.change(screen.getByLabelText(/confirmar/i), { target: { value: 'ghijkl' } })
    fireEvent.click(screen.getByRole('button', { name: /repor password/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/não coincidem/i)
    })
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('blocks submit when the password is shorter than 6 characters', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } })

    render(<ResetPasswordPage />)
    await waitFor(() => expect(screen.getByLabelText(/^nova password/i)).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/^nova password/i), { target: { value: 'abc' } })
    fireEvent.change(screen.getByLabelText(/confirmar/i), { target: { value: 'abc' } })
    fireEvent.click(screen.getByRole('button', { name: /repor password/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/pelo menos 6 caracteres/i)
    })
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('calls updateUser and shows success with the mobile deep link button when origin=mobile', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } })
    mockUpdateUser.mockResolvedValue({ error: null })
    mockSearchParamsGet.mockImplementation((key: string) => (key === 'origin' ? 'mobile' : null))

    render(<ResetPasswordPage />)
    await waitFor(() => expect(screen.getByLabelText(/^nova password/i)).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/^nova password/i), { target: { value: 'abcdef' } })
    fireEvent.change(screen.getByLabelText(/confirmar/i), { target: { value: 'abcdef' } })
    fireEvent.click(screen.getByRole('button', { name: /repor password/i }))

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'abcdef' })
    })
    expect(screen.getByRole('link', { name: /abrir a app/i })).toHaveAttribute('href', 'quicapp://login')
    expect(screen.queryByRole('link', { name: /ir para o login/i })).not.toBeInTheDocument()
  })

  it('shows the "go to login" link for team origin instead of the app deep link', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } })
    mockUpdateUser.mockResolvedValue({ error: null })
    mockSearchParamsGet.mockImplementation((key: string) => (key === 'origin' ? 'team' : null))

    render(<ResetPasswordPage />)
    await waitFor(() => expect(screen.getByLabelText(/^nova password/i)).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/^nova password/i), { target: { value: 'abcdef' } })
    fireEvent.change(screen.getByLabelText(/confirmar/i), { target: { value: 'abcdef' } })
    fireEvent.click(screen.getByRole('button', { name: /repor password/i }))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /ir para o login/i })).toHaveAttribute('href', '/auth/login')
    })
    expect(screen.queryByRole('link', { name: /abrir a app/i })).not.toBeInTheDocument()
  })

  it('shows the "go to login" link pointing at the investor login for investor origin', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } })
    mockUpdateUser.mockResolvedValue({ error: null })
    mockSearchParamsGet.mockImplementation((key: string) => (key === 'origin' ? 'investor' : null))

    render(<ResetPasswordPage />)
    await waitFor(() => expect(screen.getByLabelText(/^nova password/i)).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/^nova password/i), { target: { value: 'abcdef' } })
    fireEvent.change(screen.getByLabelText(/confirmar/i), { target: { value: 'abcdef' } })
    fireEvent.click(screen.getByRole('button', { name: /repor password/i }))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /ir para o login/i })).toHaveAttribute('href', '/investors/login')
    })
  })

  it('shows an error message when updateUser fails', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } })
    mockUpdateUser.mockResolvedValue({ error: { message: 'weak password' } })

    render(<ResetPasswordPage />)
    await waitFor(() => expect(screen.getByLabelText(/^nova password/i)).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/^nova password/i), { target: { value: 'abcdef' } })
    fireEvent.change(screen.getByLabelText(/confirmar/i), { target: { value: 'abcdef' } })
    fireEvent.click(screen.getByRole('button', { name: /repor password/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível repor a password/i)
    })
  })
})
