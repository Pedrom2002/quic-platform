import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Device from 'expo-device'

export async function registerForPushNotifications(appBaseUrl: string, accessToken: string): Promise<void> {
  if (!Device.isDevice) return
  // expo-notifications acede ao seu native module assim que e importado (nao so quando
  // chamado), e esse native module nao existe no Expo Go a partir do SDK 53 - so em
  // dev builds. Adiar o import para aqui evita rebentar o layout inteiro ao abrir a app
  // no Expo Go.
  if (Constants.appOwnership === 'expo') return

  try {
    // require (nao import) de proposito: um import estatico avalia expo-notifications
    // assim que este ficheiro e carregado, mesmo que a funcao nunca seja chamada - e e
    // essa avaliacao que rebenta no Expo Go. O require so corre aqui, depois do guard acima.
    const Notifications: typeof import('expo-notifications') = require('expo-notifications')
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
