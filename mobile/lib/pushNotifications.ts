// expo-notifications foi removido temporariamente (precisa de google-services.json/
// Firebase para builds standalone Android, que este projeto ainda não tem — a sua
// ausência causava crash nativo no arranque). Função fica no-op até ser reintroduzida
// com a config nativa correta.
export async function registerForPushNotifications(_appBaseUrl: string, _accessToken: string): Promise<void> {
  return
}
