import { useEffect } from 'react'
import { Slot, useRouter } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useSession } from '../hooks/useSession'

export default function RootLayout() {
  const { session, loading } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login')
    }
  }, [loading, session, router])

  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  )
}
