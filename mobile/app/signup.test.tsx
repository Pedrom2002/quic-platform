import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import SignupScreen from './signup'

const mockSignUp = jest.fn()
const mockReplace = jest.fn()

jest.mock('../lib/supabase', () => ({
  supabase: { auth: { signUp: (...args: unknown[]) => mockSignUp(...args) } },
}))
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}))

beforeEach(() => {
  mockSignUp.mockReset()
  mockReplace.mockReset()
})

describe('SignupScreen', () => {
  it('shows error when email already registered', async () => {
    mockSignUp.mockResolvedValue({ error: { message: 'User already registered' } })
    const { getByPlaceholderText, getByText } = render(<SignupScreen />)

    fireEvent.changeText(getByPlaceholderText('Email'), 'ja@example.com')
    fireEvent.changeText(getByPlaceholderText('Password'), 'somepass123')
    fireEvent.press(getByText('Criar conta'))

    await waitFor(() => {
      expect(getByText('Este email já está registado')).toBeTruthy()
    })
  })

  it('redirects to tabs on success', async () => {
    mockSignUp.mockResolvedValue({ error: null })
    const { getByPlaceholderText, getByText } = render(<SignupScreen />)

    fireEvent.changeText(getByPlaceholderText('Email'), 'nova@example.com')
    fireEvent.changeText(getByPlaceholderText('Password'), 'somepass123')
    fireEvent.press(getByText('Criar conta'))

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)')
    })
  })
})
