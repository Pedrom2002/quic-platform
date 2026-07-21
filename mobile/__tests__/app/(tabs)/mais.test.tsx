// mobile/__tests__/app/(tabs)/mais.test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { Alert } from 'react-native'
import MaisScreen from '../../../app/(tabs)/mais'

const mockUseSession = jest.fn()
const mockResolveUserRole = jest.fn()
const mockSignOut = jest.fn()

jest.mock('../../../hooks/useSession', () => ({ useSession: () => mockUseSession() }))
jest.mock('../../../lib/role', () => ({ resolveUserRole: (...args: unknown[]) => mockResolveUserRole(...args) }))
jest.mock('../../../lib/supabase', () => ({
  supabase: { auth: { signOut: (...args: unknown[]) => mockSignOut(...args) } },
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
    mockResolveUserRole.mockResolvedValue({ role: 'client' })

    const { getByText, queryByText } = render(<MaisScreen />)

    await waitFor(() => {
      expect(getByText('cliente@x.com')).toBeTruthy()
    })
    expect(queryByText('cliente@x.com · Cliente')).toBeNull()
    expect(getByText('Cliente')).toBeTruthy()
  })

  it('shows the app version from expo-constants', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1', email: 'a@x.com' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client' })

    const { getByText } = render(<MaisScreen />)

    await waitFor(() => {
      expect(getByText('Versão 1.0.0')).toBeTruthy()
    })
  })

  it('shows confirmation alert on logout tap without signing out yet', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1', email: 'a@x.com' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client' })

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
    mockResolveUserRole.mockResolvedValue({ role: 'client' })
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
    mockResolveUserRole.mockResolvedValue({ role: 'client' })
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
})
