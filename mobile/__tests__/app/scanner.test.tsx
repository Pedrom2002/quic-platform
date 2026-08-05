import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, waitFor } from '@testing-library/react-native'
import ScannerScreen from '../../app/scanner'

const mockUseSession = jest.fn()
const mockResolveUserRole = jest.fn<
  (...args: unknown[]) => Promise<
    | { role: 'client' }
    | { role: 'staff'; member: { id: string; full_name: string; role: string } }
  >
>()
const mockCheckInTicket = jest.fn()

let capturedOnBarcodeScanned: ((event: { data: string }) => void) | undefined

jest.mock('../../hooks/useSession', () => ({ useSession: () => mockUseSession() }))
jest.mock('../../lib/role', () => ({ resolveUserRole: (...args: unknown[]) => mockResolveUserRole(...args) }))
jest.mock('../../lib/supabase', () => ({ supabase: {} }))
jest.mock('../../lib/checkin', () => ({ checkInTicket: (...args: unknown[]) => mockCheckInTicket(...args) }))
jest.mock('expo-camera', () => ({
  CameraView: (props: { onBarcodeScanned?: (event: { data: string }) => void }) => {
    capturedOnBarcodeScanned = props.onBarcodeScanned
    return null
  },
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
}))

beforeEach(() => {
  mockUseSession.mockReset()
  mockResolveUserRole.mockReset()
  mockCheckInTicket.mockReset()
  capturedOnBarcodeScanned = undefined
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

  it('ignores a second rapid scan while the first check-in call is still in flight', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'staff', member: { id: 'm1', full_name: 'João', role: 'manager' } })

    let resolveCheckIn!: (value: { success: boolean }) => void
    mockCheckInTicket.mockReturnValue(
      new Promise(resolve => {
        resolveCheckIn = resolve
      })
    )

    render(<ScannerScreen />)

    await waitFor(() => {
      expect(capturedOnBarcodeScanned).toBeDefined()
    })

    capturedOnBarcodeScanned!({ data: 'qr-abc-123' })
    capturedOnBarcodeScanned!({ data: 'qr-abc-123' })

    await waitFor(() => {
      expect(mockCheckInTicket).toHaveBeenCalledTimes(1)
    })

    resolveCheckIn({ success: true })
  })
})
