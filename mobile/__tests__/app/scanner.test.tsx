import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, waitFor } from '@testing-library/react-native'
import ScannerScreen from '../../app/scanner'

const mockUseSession = jest.fn()
const mockResolveUserRole = jest.fn()

jest.mock('../../hooks/useSession', () => ({ useSession: () => mockUseSession() }))
jest.mock('../../lib/role', () => ({ resolveUserRole: (...args: unknown[]) => mockResolveUserRole(...args) }))
jest.mock('../../lib/supabase', () => ({ supabase: {} }))
jest.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
}))

beforeEach(() => {
  mockUseSession.mockReset()
  mockResolveUserRole.mockReset()
})

describe('ScannerScreen', () => {
  it('shows restricted message for non-staff roles', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client' })

    const { getByText } = render(<ScannerScreen />)

    await waitFor(() => {
      expect(getByText('Acesso reservado à equipa Quic')).toBeTruthy()
    })
  })

  it('renders the camera for staff role', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'staff', member: { id: 'm1', full_name: 'João', role: 'manager' } })

    const { queryByText } = render(<ScannerScreen />)

    await waitFor(() => {
      expect(queryByText('Acesso reservado à equipa Quic')).toBeNull()
    })
  })
})
