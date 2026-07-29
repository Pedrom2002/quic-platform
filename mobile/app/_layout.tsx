import { useEffect } from 'react'
import { Appearance, Platform } from 'react-native'
import { Slot, useRouter } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useSession } from '../hooks/useSession'
import { CartProvider } from '../hooks/useCart'
import { registerPushNotificationTapHandler } from '../lib/pushNavigation'

if (Platform.OS !== 'web') {
  Appearance.setColorScheme('light')
}

export default function RootLayout() {
  const { session, loading } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (Platform.OS === 'web') return
    Appearance.setColorScheme('light')
    const subscription = Appearance.addChangeListener(() => {
      Appearance.setColorScheme('light')
    })
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login')
    }
  }, [loading, session, router])

  useEffect(() => {
    if (Platform.OS === 'web') return
    return registerPushNotificationTapHandler(router)
  }, [router])

  return (
    <SafeAreaProvider>
      <CartProvider>
        <Slot />
      </CartProvider>
    </SafeAreaProvider>
  )
}
