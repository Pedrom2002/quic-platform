import { useEffect, useState } from 'react'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSession } from '../../hooks/useSession'
import { resolveUserRole } from '../../lib/role'
import { supabase } from '../../lib/supabase'
import { QUIC_MAGENTA } from '../../lib/theme'
import { registerForPushNotifications } from '../../lib/pushNotifications'

export default function TabsLayout() {
  const { session } = useSession()
  const [isArtist, setIsArtist] = useState(false)
  const [clientPortalToken, setClientPortalToken] = useState<string | null>(null)

  useEffect(() => {
    resolveUserRole(supabase, session).then(role => {
      setIsArtist(role.role === 'artist')
      setClientPortalToken(role.role === 'client' ? role.portalToken : null)

      if (role.role === 'client' && session?.access_token) {
        registerForPushNotifications(process.env.EXPO_PUBLIC_APP_URL!, session.access_token)
      }
    }).catch(() => {
      // Falha a resolver o papel do utilizador não deve rebentar a app —
      // fica sem tabs de artista/cliente até à próxima mudança de sessão.
    })
  }, [session])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: QUIC_MAGENTA,
        tabBarInactiveTintColor: '#a8a29e',
        tabBarLabelStyle: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tickets',
          tabBarAccessibilityLabel: 'Tickets',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="catalogo"
        options={{
          title: 'Rental',
          tabBarAccessibilityLabel: 'Rental',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="portal"
        options={{
          title: isArtist ? 'Artists' : 'Events',
          href: (isArtist || clientPortalToken) ? undefined : null,
          tabBarAccessibilityLabel: isArtist ? 'Artists' : 'Events',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mais"
        options={{
          title: 'Perfil',
          tabBarAccessibilityLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="golden-circle"
        options={{
          title: 'Gold',
          tabBarAccessibilityLabel: 'Golden Circle',
          tabBarIcon: ({ color, size }) => <Ionicons name="star-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
