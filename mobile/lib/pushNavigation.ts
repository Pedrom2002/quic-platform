import Constants from 'expo-constants'

type Router = { push: (href: string) => void }

// Todas as push notifications desta app vêm do portal do cliente (checklist,
// imprensa, documentos), por isso tocar em qualquer uma delas abre sempre o
// separador Portal — não há payload por-tipo a decidir uma rota diferente.
export function registerPushNotificationTapHandler(router: Router): () => void {
  // expo-notifications acede ao seu native module assim que e importado (nao so quando
  // chamado), e esse native module nao existe no Expo Go a partir do SDK 53 - so em
  // dev builds. Adiar o require para aqui evita rebentar o layout inteiro ao abrir a app
  // no Expo Go.
  if (Constants.appOwnership === 'expo') return () => undefined

  const Notifications: typeof import('expo-notifications') = require('expo-notifications')
  const subscription = Notifications.addNotificationResponseReceivedListener(() => {
    router.push('/(tabs)/portal')
  })

  return () => subscription.remove()
}
