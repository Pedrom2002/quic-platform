import * as Notifications from 'expo-notifications'

type Router = { push: (href: string) => void }

// Todas as push notifications desta app vêm do portal do cliente (checklist,
// imprensa, documentos), por isso tocar em qualquer uma delas abre sempre o
// separador Portal — não há payload por-tipo a decidir uma rota diferente.
export function registerPushNotificationTapHandler(router: Router): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(() => {
    router.push('/(tabs)/portal')
  })

  return () => subscription.remove()
}
