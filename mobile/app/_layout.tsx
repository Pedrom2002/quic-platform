import { useEffect } from 'react'
import { Appearance } from 'react-native'
import { Slot, useRouter } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useSession } from '../hooks/useSession'
import { CartProvider } from '../hooks/useCart'

Appearance.setColorScheme('light')

export default function RootLayout() {
  const { session, loading } = useSession()
  const router = useRouter()

  useEffect(() => {
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

  return (
    <SafeAreaProvider>
      <CartProvider>
        <Slot />
      </CartProvider>
    </SafeAreaProvider>
  )
}
