type Router = { push: (href: string) => void }

// expo-notifications foi removido temporariamente (precisa de google-services.json/
// Firebase para builds standalone Android, que este projeto ainda não tem — a sua
// ausência causava crash nativo no arranque). Handler fica no-op até ser reintroduzido
// com a config nativa correta.
export function registerPushNotificationTapHandler(_router: Router): () => void {
  return () => undefined
}
