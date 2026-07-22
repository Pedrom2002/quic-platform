import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, waitFor } from '@testing-library/react-native'
import RootLayout from '../../app/_layout'

const mockUseSession = jest.fn()
const mockReplace = jest.fn()

jest.mock('../../hooks/useSession', () => ({ useSession: () => mockUseSession() }))
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  Slot: () => null,
}))
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
  },
}))

beforeEach(() => {
  mockUseSession.mockReset()
  mockReplace.mockReset()
})

describe('RootLayout', () => {
  it('redirects to login when no session', async () => {
    mockUseSession.mockReturnValue({ session: null, loading: false })
    render(<RootLayout />)

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login')
    })
  })

  it('does not redirect while loading', () => {
    mockUseSession.mockReturnValue({ session: null, loading: true })
    render(<RootLayout />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('does not redirect when session present', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    render(<RootLayout />)
    await new Promise((r) => setTimeout(r, 0))
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
