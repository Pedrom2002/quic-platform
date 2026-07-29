import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'

export async function registerForPushNotifications(appBaseUrl: string, accessToken: string): Promise<void> {
  if (!Device.isDevice) return

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return

  const { data: token } = await Notifications.getExpoPushTokenAsync()

  try {
    await fetch(`${appBaseUrl}/api/portal/push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ token }),
    })
  } catch {
    // Falha de rede ao registar o token não deve bloquear o uso da app —
    // o cliente continua a receber notificações pelos outros canais (email).
  }
}
