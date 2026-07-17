import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { useSession } from '../../hooks/useSession'
import { resolveUserRole, type UserRole } from '../../lib/role'
import { supabase } from '../../lib/supabase'

export default function PortalScreen() {
  const { session } = useSession()
  const [role, setRole] = useState<UserRole | null>(null)

  useEffect(() => {
    resolveUserRole(supabase, session).then(setRole)
  }, [session])

  if (!role) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#111111" />
      </View>
    )
  }

  if (role.role === 'artist') {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>PORTAL DO ARTISTA</Text>
        <Text style={styles.name}>{role.artist.name}</Text>
      </View>
    )
  }

  return (
    <View style={styles.center}>
      <Text style={styles.restricted}>Portal reservado a artistas agenciados</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111', justifyContent: 'center', paddingHorizontal: 24 },
  center: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 3, marginBottom: 12 },
  name: { color: '#ffffff', fontSize: 40, fontWeight: 'bold' },
  restricted: { color: '#57534e', fontSize: 14, textAlign: 'center' },
})
