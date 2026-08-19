import { describe, it, expect, jest } from '@jest/globals'
import { registerPushNotificationTapHandler } from './pushNavigation'

describe('registerPushNotificationTapHandler', () => {
  it('is a no-op (expo-notifications removed until Firebase config exists)', () => {
    const router = { push: jest.fn() }
    const unsubscribe = registerPushNotificationTapHandler(router)
    expect(() => unsubscribe()).not.toThrow()
  })
})
