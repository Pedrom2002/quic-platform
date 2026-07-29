import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockGetPermissionsAsync = jest.fn()
const mockRequestPermissionsAsync = jest.fn()
const mockGetExpoPushTokenAsync = jest.fn()
const mockIsDevice = { value: true }

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: (...args: unknown[]) => mockGetPermissionsAsync(...args),
  requestPermissionsAsync: (...args: unknown[]) => mockRequestPermissionsAsync(...args),
  getExpoPushTokenAsync: (...args: unknown[]) => mockGetExpoPushTokenAsync(...args),
}))
jest.mock('expo-device', () => ({
  get isDevice() { return mockIsDevice.value },
}))

import { registerForPushNotifications } from './pushNotifications'

const mockFetch = jest.fn()
global.fetch = mockFetch as never

beforeEach(() => {
  mockGetPermissionsAsync.mockReset()
  mockRequestPermissionsAsync.mockReset()
  mockGetExpoPushTokenAsync.mockReset()
  mockFetch.mockReset()
  mockIsDevice.value = true
})

describe('registerForPushNotifications', () => {
  it('não faz nada quando não corre num dispositivo físico', async () => {
    mockIsDevice.value = false
    await registerForPushNotifications('https://app.example.com', 'access-token-abc')
    expect(mockGetPermissionsAsync).not.toHaveBeenCalled()
  })

  it('pede permissão quando ainda não foi concedida', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' })
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mockGetExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[abc]' })
    mockFetch.mockResolvedValue({ ok: true })

    await registerForPushNotifications('https://app.example.com', 'access-token-abc')

    expect(mockRequestPermissionsAsync).toHaveBeenCalled()
  })

  it('não regista nada quando a permissão é recusada', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' })
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' })

    await registerForPushNotifications('https://app.example.com', 'access-token-abc')

    expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('envia o token para a API quando a permissão já estava concedida', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mockGetExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[abc]' })
    mockFetch.mockResolvedValue({ ok: true })

    await registerForPushNotifications('https://app.example.com', 'access-token-abc')

    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled()
    expect(mockFetch).toHaveBeenCalledWith('https://app.example.com/api/portal/push-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer access-token-abc' },
      body: JSON.stringify({ token: 'ExponentPushToken[abc]' }),
    })
  })

  it('não rebenta quando o fetch falha', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mockGetExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[abc]' })
    mockFetch.mockRejectedValue(new Error('network error'))

    await expect(registerForPushNotifications('https://app.example.com', 'access-token-abc')).resolves.not.toThrow()
  })
})
