import { useEffect, useState } from 'react'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSession } from '../../hooks/useSession'
import { resolveUserRole } from '../../lib/role'
import { supabase } from '../../lib/supabase'

export default function TabsLayout() {
  const { session } = useSession()
  const [isArtist, setIsArtist] = useState(false)
  const [clientPortalToken, setClientPortalToken] = useState<string | null>(null)

  useEffect(() => {
    resolveUserRole(supabase, session).then(role => {
      setIsArtist(role.role === 'artist')
      setClientPortalToken(role.role === 'client' ? role.portalToken : null)
    })
  }, [session])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#9333EA',
        tabBarInactiveTintColor: '#a8a29e',
        tabBarLabelStyle: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="catalogo"
        options={{
          title: 'Catálogo',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="portal"
        options={{
          title: 'Portal',
          href: (isArtist || clientPortalToken) ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mais"
        options={{
          title: 'Mais',
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
