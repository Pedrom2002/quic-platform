import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'

export async function registerForPushNotifications(appBaseUrl: string, accessToken: string): Promise<void> {
  if (!Device.isDevice) return

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
      })
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') return

    const { data: token } = await Notifications.getExpoPushTokenAsync()

    await fetch(`${appBaseUrl}/api/portal/push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ token }),
    })
  } catch {
    // Falha ao registar push (permissão, Play Services, rede) não deve
    // bloquear o uso da app — o cliente continua a receber notificações
    // pelos outros canais (email).
  }
}
