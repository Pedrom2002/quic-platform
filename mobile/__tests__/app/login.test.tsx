import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { Alert } from 'react-native'
jest.mock('expo-video', () => ({
  useVideoPlayer: () => ({ loop: false, muted: false, play: jest.fn() }),
  VideoView: () => null,
}))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => children ?? null,
}))
import LoginScreen from '../../app/login'

const mockSignInWithPassword = jest.fn<
  (...args: unknown[]) => Promise<{ error: { message: string } | null }>
>()
const mockResetPasswordForEmail = jest.fn<
  (...args: unknown[]) => Promise<{ error: { message: string } | null }>
>()
const mockReplace = jest.fn()

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
    },
  },
}))
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}))

beforeEach(() => {
  mockSignInWithPassword.mockReset()
  mockResetPasswordForEmail.mockReset()
  mockReplace.mockReset()
  jest.spyOn(Alert, 'alert').mockImplementation(() => {})
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

describe('LoginScreen — forgot password', () => {
  it('calls resetPasswordForEmail with the mobile redirectTo and shows a confirmation alert', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null })
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})

    const { getByText, getByPlaceholderText } = render(<LoginScreen />)
    fireEvent.changeText(getByPlaceholderText('Email'), 'user@quic.pt')
    fireEvent.press(getByText('Esqueci-me da password'))

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@quic.pt', {
        redirectTo: expect.stringContaining('/auth/callback?next=/reset-password&origin=mobile'),
      })
    })
    expect(alertSpy).toHaveBeenCalledWith(
      'Verifica o teu email',
      'Se esse email existir, vais receber um link para repor a password.'
    )
  })

  it('shows an error alert instead of calling resetPasswordForEmail when the email field is empty', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})

    const { getByText } = render(<LoginScreen />)
    fireEvent.press(getByText('Esqueci-me da password'))

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Erro', 'Introduz o teu email primeiro.')
    })
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled()
  })
})
