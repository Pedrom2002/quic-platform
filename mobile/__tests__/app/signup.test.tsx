import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import SignupScreen from '../../app/signup'

const mockSignUp = jest.fn()
const mockReplace = jest.fn()

jest.mock('../../lib/supabase', () => ({
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
    fireEvent.changeText(getByPlaceholderText('Confirmar password'), 'somepass123')
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
    fireEvent.changeText(getByPlaceholderText('Confirmar password'), 'somepass123')
    fireEvent.press(getByText('Criar conta'))

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)')
    })
  })

  it('shows error for invalid email', async () => {
    const { getByPlaceholderText, getByText } = render(<SignupScreen />)

    fireEvent.changeText(getByPlaceholderText('Email'), 'not-an-email')
    fireEvent.changeText(getByPlaceholderText('Password'), 'somepass123')
    fireEvent.changeText(getByPlaceholderText('Confirmar password'), 'somepass123')
    fireEvent.press(getByText('Criar conta'))

    await waitFor(() => {
      expect(getByText('Email inválido')).toBeTruthy()
    })
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('shows error when password is too short', async () => {
    const { getByPlaceholderText, getByText } = render(<SignupScreen />)

    fireEvent.changeText(getByPlaceholderText('Email'), 'nova@example.com')
    fireEvent.changeText(getByPlaceholderText('Password'), '123')
    fireEvent.changeText(getByPlaceholderText('Confirmar password'), '123')
    fireEvent.press(getByText('Criar conta'))

    await waitFor(() => {
      expect(getByText('A password precisa de pelo menos 6 caracteres')).toBeTruthy()
    })
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('shows error when passwords do not match', async () => {
    const { getByPlaceholderText, getByText } = render(<SignupScreen />)

    fireEvent.changeText(getByPlaceholderText('Email'), 'nova@example.com')
    fireEvent.changeText(getByPlaceholderText('Password'), 'somepass123')
    fireEvent.changeText(getByPlaceholderText('Confirmar password'), 'different123')
    fireEvent.press(getByText('Criar conta'))

    await waitFor(() => {
      expect(getByText('As passwords não coincidem')).toBeTruthy()
    })
    expect(mockSignUp).not.toHaveBeenCalled()
  })
})
