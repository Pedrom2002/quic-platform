import { describe, it, expect } from '@jest/globals'
import { registerForPushNotifications } from './pushNotifications'

describe('registerForPushNotifications', () => {
  it('is a no-op (expo-notifications removed until Firebase config exists)', async () => {
    await expect(registerForPushNotifications('https://app.example.com', 'access-token-abc')).resolves.toBeUndefined()
  })
})
