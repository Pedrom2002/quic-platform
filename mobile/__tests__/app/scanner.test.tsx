import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, waitFor, fireEvent } from '@testing-library/react-native'
import { Linking } from 'react-native'
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
const mockRequestPermission = jest.fn()
// Mutavel por teste: o mock de useCameraPermissions le este valor a cada
// render, para simular permissao concedida/negada sem reescrever o modulo.
let mockPermissionState: { granted: boolean; canAskAgain: boolean } | null = { granted: true, canAskAgain: true }

jest.mock('../../hooks/useSession', () => ({ useSession: () => mockUseSession() }))
jest.mock('../../lib/role', () => ({ resolveUserRole: (...args: unknown[]) => mockResolveUserRole(...args) }))
jest.mock('../../lib/supabase', () => ({ supabase: {} }))
jest.mock('../../lib/checkin', () => ({ checkInTicket: (...args: unknown[]) => mockCheckInTicket(...args) }))
jest.mock('expo-camera', () => ({
  CameraView: (props: { onBarcodeScanned?: (event: { data: string }) => void }) => {
    capturedOnBarcodeScanned = props.onBarcodeScanned
    return null
  },
  useCameraPermissions: () => [mockPermissionState, mockRequestPermission],
}))

beforeEach(() => {
  mockUseSession.mockReset()
  mockResolveUserRole.mockReset()
  mockCheckInTicket.mockReset()
  mockRequestPermission.mockReset()
  capturedOnBarcodeScanned = undefined
  mockPermissionState = { granted: true, canAskAgain: true }
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

  it('shows a request-permission prompt instead of a blank screen when denied', async () => {
    mockPermissionState = { granted: false, canAskAgain: true }
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'staff', member: { id: 'm1', full_name: 'João', role: 'manager' } })

    const { getByText } = render(<ScannerScreen />)

    await waitFor(() => {
      expect(getByText('Permitir câmara')).toBeTruthy()
    })
  })

  it('asks for permission again when the prompt button is pressed and it can still be asked', async () => {
    mockPermissionState = { granted: false, canAskAgain: true }
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'staff', member: { id: 'm1', full_name: 'João', role: 'manager' } })

    const { getByText } = render(<ScannerScreen />)
    await waitFor(() => expect(getByText('Permitir câmara')).toBeTruthy())

    fireEvent.press(getByText('Permitir câmara'))

    expect(mockRequestPermission).toHaveBeenCalled()
  })

  it('opens device settings when permission was permanently denied', async () => {
    const openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined)
    mockPermissionState = { granted: false, canAskAgain: false }
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'staff', member: { id: 'm1', full_name: 'João', role: 'manager' } })

    const { getByText } = render(<ScannerScreen />)
    await waitFor(() => expect(getByText('Abrir definições')).toBeTruthy())
    mockRequestPermission.mockClear() // limpa a chamada feita pelo useEffect no mount

    fireEvent.press(getByText('Abrir definições'))

    expect(openSettingsSpy).toHaveBeenCalled()
    expect(mockRequestPermission).not.toHaveBeenCalled()
  })
})
