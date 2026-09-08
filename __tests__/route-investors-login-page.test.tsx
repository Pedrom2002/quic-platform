// @vitest-environment jsdom
// __tests__/route-investors-login-page.test.tsx
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'

const { mockResetPasswordForEmail, mockCreateClient } = vi.hoisted(() => ({
  mockResetPasswordForEmail: vi.fn(),
  mockCreateClient: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: mockCreateClient,
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
global.fetch = vi.fn()

import InvestorLoginPage from '@/app/investors/(public)/login/page'

afterEach(cleanup)

beforeEach(() => {
  mockResetPasswordForEmail.mockReset()
  mockCreateClient.mockReset()
  mockCreateClient.mockReturnValue({
    auth: { resetPasswordForEmail: mockResetPasswordForEmail },
  })
  ;(global.fetch as ReturnType<typeof vi.fn>).mockReset()
})

describe('InvestorLoginPage — forgot password', () => {
  it('switches to the forgot-password form when the link is clicked', () => {
    render(<InvestorLoginPage />)

    fireEvent.click(screen.getByRole('button', { name: /esqueci-me da password/i }))

    expect(screen.getByRole('button', { name: /enviar link/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument()
  })

  it('calls resetPasswordForEmail with the investor redirectTo and shows the generic success message', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null })

    render(<InvestorLoginPage />)
    fireEvent.click(screen.getByRole('button', { name: /esqueci-me da password/i }))
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'investor@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar link/i }))

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('investor@example.com', {
        redirectTo: expect.stringContaining('/auth/callback?next=/reset-password&origin=investor'),
      })
    })
    expect(screen.getByText(/se esse email existir/i)).toBeInTheDocument()
  })

  it('shows the same generic success message even when resetPasswordForEmail errors', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: { message: 'boom' } })

    render(<InvestorLoginPage />)
    fireEvent.click(screen.getByRole('button', { name: /esqueci-me da password/i }))
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'investor@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar link/i }))

    await waitFor(() => {
      expect(screen.getByText(/se esse email existir/i)).toBeInTheDocument()
    })
  })

  it('does not get stuck loading when resetPasswordForEmail rejects', async () => {
    mockResetPasswordForEmail.mockRejectedValue(new Error('network down'))

    render(<InvestorLoginPage />)
    fireEvent.click(screen.getByRole('button', { name: /esqueci-me da password/i }))
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'investor@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar link/i }))

    await waitFor(() => {
      expect(screen.getByText(/se esse email existir/i)).toBeInTheDocument()
    })
  })
})
