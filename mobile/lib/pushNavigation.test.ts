import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockAddListener = jest.fn()
const mockRemove = jest.fn()
const mockAppOwnership = { value: null as string | null }

jest.mock('expo-notifications', () => ({
  addNotificationResponseReceivedListener: (...args: unknown[]) => mockAddListener(...args),
}))
jest.mock('expo-constants', () => ({
  get appOwnership() { return mockAppOwnership.value },
}))

import { registerPushNotificationTapHandler } from './pushNavigation'

beforeEach(() => {
  mockAddListener.mockReset().mockReturnValue({ remove: mockRemove })
  mockRemove.mockReset()
  mockAppOwnership.value = null
})

describe('registerPushNotificationTapHandler', () => {
  it('não regista nada quando corre no Expo Go (expo-notifications indisponível no SDK 53+)', () => {
    mockAppOwnership.value = 'expo'
    const router = { push: jest.fn() }
    const unsubscribe = registerPushNotificationTapHandler(router)

    expect(mockAddListener).not.toHaveBeenCalled()
    expect(() => unsubscribe()).not.toThrow()
  })

  it('regista um listener de resposta a notificações', () => {
    const router = { push: jest.fn() }
    registerPushNotificationTapHandler(router)
    expect(mockAddListener).toHaveBeenCalledTimes(1)
  })

  it('navega para o separador Portal quando a notificação é tocada', () => {
    const router = { push: jest.fn() }
    registerPushNotificationTapHandler(router)

    const listenerCallback = mockAddListener.mock.calls[0][0] as () => void
    listenerCallback()

    expect(router.push).toHaveBeenCalledWith('/(tabs)/portal')
  })

  it('devolve uma função que remove o listener', () => {
    const router = { push: jest.fn() }
    const unsubscribe = registerPushNotificationTapHandler(router)
    unsubscribe()
    expect(mockRemove).toHaveBeenCalledTimes(1)
  })
})
