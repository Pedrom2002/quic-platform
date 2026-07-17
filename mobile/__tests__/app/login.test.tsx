import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import LoginScreen from '../../app/login'

const mockSignInWithPassword = jest.fn()
const mockReplace = jest.fn()

jest.mock('../../lib/supabase', () => ({
  supabase: { auth: { signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args) } },
}))
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}))

beforeEach(() => {
  mockSignInWithPassword.mockReset()
  mockReplace.mockReset()
})

describe('LoginScreen', () => {
  it('shows error on invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    const { getByPlaceholderText, getByText } = render(<LoginScreen />)

    fireEvent.changeText(getByPlaceholderText('Email'), 'maria@example.com')
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrong-pass')
    fireEvent.press(getByText('Entrar'))

    await waitFor(() => {
      expect(getByText('Credenciais inválidas')).toBeTruthy()
    })
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('redirects to tabs on success', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null })
    const { getByPlaceholderText, getByText } = render(<LoginScreen />)

    fireEvent.changeText(getByPlaceholderText('Email'), 'maria@example.com')
    fireEvent.changeText(getByPlaceholderText('Password'), 'correct-pass')
    fireEvent.press(getByText('Entrar'))

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)')
    })
  })
})
