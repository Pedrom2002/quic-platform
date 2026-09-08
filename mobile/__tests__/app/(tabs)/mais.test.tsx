// mobile/__tests__/app/(tabs)/mais.test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { Alert } from 'react-native'
import MaisScreen from '../../../app/(tabs)/mais'
import type { UserRole } from '../../../lib/role'

const mockUseSession = jest.fn()
const mockResolveUserRole = jest.fn<(...args: unknown[]) => Promise<UserRole>>()
const mockSignOut = jest.fn<(...args: unknown[]) => Promise<{ error: { message: string } | null }>>()
const mockGetSession = jest.fn<(...args: unknown[]) => Promise<{ data: { session: { access_token: string } | null } }>>()
const mockDeleteOwnAccount = jest.fn<(...args: unknown[]) => Promise<{ success: boolean; error?: string }>>()

jest.mock('../../../hooks/useSession', () => ({ useSession: () => mockUseSession() }))
jest.mock('../../../lib/role', () => ({ resolveUserRole: (...args: unknown[]) => mockResolveUserRole(...args) }))
jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: (...args: unknown[]) => mockSignOut(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}))
jest.mock('../../../lib/accountDeletion', () => ({
  deleteOwnAccount: (...args: unknown[]) => mockDeleteOwnAccount(...args),
}))
jest.mock('expo-constants', () => ({ expoConfig: { version: '1.0.0' } }))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

beforeEach(() => {
  mockUseSession.mockReset()
  mockResolveUserRole.mockReset()
  mockSignOut.mockReset()
  mockSignOut.mockResolvedValue({ error: null })
  mockGetSession.mockReset()
  mockGetSession.mockResolvedValue({ data: { session: { access_token: 'token-123' } } })
  mockDeleteOwnAccount.mockReset()
  mockDeleteOwnAccount.mockResolvedValue({ success: true })
  jest.spyOn(Alert, 'alert').mockImplementation(() => {})
})

describe('MaisScreen', () => {
  it('shows artist name, email and translated role', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1', email: 'artista@x.com' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({
      role: 'artist',
      artist: { id: 'a1', name: 'Maria Silva', photo_url: null, bio: null },
    })

    const { getByText } = render(<MaisScreen />)

    await waitFor(() => {
      expect(getByText('Maria Silva')).toBeTruthy()
    })
    expect(getByText('artista@x.com · Artista')).toBeTruthy()
  })

  it('shows email as name for client role without duplicating it', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u2', email: 'cliente@x.com' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client', portalToken: null })

    const { getByText, queryByText } = render(<MaisScreen />)

    await waitFor(() => {
      expect(getByText('cliente@x.com')).toBeTruthy()
    })
    expect(queryByText('cliente@x.com · Cliente')).toBeNull()
    expect(getByText('Cliente')).toBeTruthy()
  })

  it('shows the app version from expo-constants', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1', email: 'a@x.com' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client', portalToken: null })

    const { getByText } = render(<MaisScreen />)

    await waitFor(() => {
      expect(getByText('Versão 1.0.0')).toBeTruthy()
    })
  })

  it('shows confirmation alert on logout tap without signing out yet', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1', email: 'a@x.com' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client', portalToken: null })

    const { getByText } = render(<MaisScreen />)
    await waitFor(() => expect(getByText('Terminar sessão')).toBeTruthy())

    fireEvent.press(getByText('Terminar sessão'))

    expect(Alert.alert).toHaveBeenCalledWith(
      'Terminar sessão',
      'Tens a certeza que queres terminar sessão?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancelar', style: 'cancel' }),
        expect.objectContaining({ text: 'Terminar sessão', style: 'destructive' }),
      ])
    )
    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it('calls signOut when the destructive alert button is confirmed', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1', email: 'a@x.com' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client', portalToken: null })
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const destructive = buttons?.find(b => b.style === 'destructive')
      destructive?.onPress?.()
    })

    const { getByText } = render(<MaisScreen />)
    await waitFor(() => expect(getByText('Terminar sessão')).toBeTruthy())

    fireEvent.press(getByText('Terminar sessão'))

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  it('shows error alert when signOut fails', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1', email: 'a@x.com' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client', portalToken: null })
    mockSignOut.mockRejectedValue(new Error('network down'))
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const destructive = buttons?.find(b => b.style === 'destructive')
      destructive?.onPress?.()
    })

    const { getByText } = render(<MaisScreen />)
    await waitFor(() => expect(getByText('Terminar sessão')).toBeTruthy())

    fireEvent.press(getByText('Terminar sessão'))

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Erro', 'Não foi possível terminar sessão. Tenta novamente.')
    })
  })

  it('opens legal links to privacy policy and terms', async () => {
    const { Linking } = require('react-native')
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1', email: 'a@x.com' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client', portalToken: null })

    const { getByText } = render(<MaisScreen />)
    await waitFor(() => expect(getByText('Política de Privacidade')).toBeTruthy())

    fireEvent.press(getByText('Política de Privacidade'))
    fireEvent.press(getByText('Termos e Condições'))

    expect(openURLSpy).toHaveBeenCalledWith('https://quic.pt/privacy-policy')
    expect(openURLSpy).toHaveBeenCalledWith('https://quic.pt/terms')
  })

  it('requires two confirmations before deleting the account', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1', email: 'a@x.com' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client', portalToken: null })

    const { getByText } = render(<MaisScreen />)
    await waitFor(() => expect(getByText('Eliminar conta')).toBeTruthy())

    fireEvent.press(getByText('Eliminar conta'))

    expect(Alert.alert).toHaveBeenCalledWith(
      'Eliminar conta',
      expect.stringContaining('irreversível'),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancelar', style: 'cancel' }),
        expect.objectContaining({ text: 'Continuar', style: 'destructive' }),
      ])
    )
    // So a primeira confirmacao foi mostrada; sem accionar "Continuar", a
    // segunda pergunta e a eliminacao real nao acontecem.
    expect(mockDeleteOwnAccount).not.toHaveBeenCalled()
  })

  it('deletes the account and signs out after both confirmations', async () => {
    let confirmationStep = 0
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      confirmationStep++
      const destructive = buttons?.find(b => b.style === 'destructive')
      destructive?.onPress?.()
    })
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1', email: 'a@x.com' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client', portalToken: null })

    const { getByText } = render(<MaisScreen />)
    await waitFor(() => expect(getByText('Eliminar conta')).toBeTruthy())

    fireEvent.press(getByText('Eliminar conta'))

    await waitFor(() => {
      expect(confirmationStep).toBe(2)
      expect(mockDeleteOwnAccount).toHaveBeenCalledWith(process.env.EXPO_PUBLIC_APP_URL, 'token-123')
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  it('shows an error and does not sign out when account deletion fails', async () => {
    mockDeleteOwnAccount.mockResolvedValue({ success: false, error: 'Não foi possível eliminar a conta.' })
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const destructive = buttons?.find(b => b.style === 'destructive')
      destructive?.onPress?.()
    })
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1', email: 'a@x.com' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client', portalToken: null })

    const { getByText } = render(<MaisScreen />)
    await waitFor(() => expect(getByText('Eliminar conta')).toBeTruthy())

    fireEvent.press(getByText('Eliminar conta'))

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Erro', 'Não foi possível eliminar a conta.')
    })
    expect(mockSignOut).not.toHaveBeenCalled()
  })
})
