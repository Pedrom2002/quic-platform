// mobile/app/(tabs)/mais.tsx
import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, Pressable, Alert, StyleSheet, ScrollView } from 'react-native'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { useSession } from '../../hooks/useSession'
import { displayArtistName } from '../../lib/artistName'
import { resolveUserRole, type UserRole } from '../../lib/role'
import { supabase } from '../../lib/supabase'
import { QUIC_MAGENTA, colors } from '../../lib/theme'
import { BannerHeader } from '../../components/BannerHeader'

function roleLabel(role: UserRole): string {
  if (role.role === 'artist') return 'Artista'
  if (role.role === 'staff') return 'Staff'
  if (role.role === 'client') return 'Cliente'
  return 'Convidado'
}

function displayName(role: UserRole, email: string): string {
  if (role.role === 'artist') return displayArtistName(role.artist.name)
  if (role.role === 'staff') return role.member.full_name
  return email
}

function MaisContent({ role, email }: { role: UserRole; email: string }) {
  const router = useRouter()
  const name = displayName(role, email)
  const label = roleLabel(role)
  const appVersion = Constants.expoConfig?.version ?? '—'

  function handleSignOut() {
    Alert.alert('Terminar sessão', 'Tens a certeza que queres terminar sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Terminar sessão',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.auth.signOut()
          } catch {
            Alert.alert('Erro', 'Não foi possível terminar sessão. Tenta novamente.')
          }
        },
      },
    ])
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <BannerHeader source={require('../../assets/banners/mais.png')} />
      <View style={styles.nameBlock}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.slice(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.subtitle}>{name === email ? label : `${email} · ${label}`}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionLabel}>Sobre</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>QUIC — Event Management Platform</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Versão {appVersion}</Text>
        </View>

        <Text style={styles.sectionLabel}>Bilhetes</Text>
        <Pressable style={styles.card} onPress={() => router.push('/tickets')} accessibilityRole="button">
          <Text style={styles.cardTitle}>Os meus bilhetes</Text>
        </Pressable>
        {role.role === 'staff' && (
          <Pressable style={styles.card} onPress={() => router.push('/scanner')} accessibilityRole="button">
            <Text style={styles.cardTitle}>Scanner de check-in</Text>
          </Pressable>
        )}

        <Text style={styles.sectionLabel}>Definições</Text>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Notificações</Text>
            <Text style={styles.comingSoon}>Em breve</Text>
          </View>
        </View>

        <Pressable style={styles.logoutButton} onPress={handleSignOut} accessibilityRole="button">
          <Text style={styles.logoutText}>Terminar sessão</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

export default function MaisScreen() {
  const { session } = useSession()
  const [role, setRole] = useState<UserRole | null>(null)

  useEffect(() => {
    resolveUserRole(supabase, session).then(setRole)
  }, [session])

  if (!role || !session) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={QUIC_MAGENTA} />
      </View>
    )
  }

  return <MaisContent role={role} email={session.user.email ?? ''} />
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { flexGrow: 1 },
  center: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
  nameBlock: { paddingHorizontal: 24, paddingVertical: 20 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: QUIC_MAGENTA, fontSize: 18, fontWeight: '700' },
  name: { color: colors.gray900, fontSize: 20, fontWeight: 'bold' },
  subtitle: { color: colors.gray400, fontSize: 12, marginTop: 2 },
  body: { padding: 16 },
  sectionLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: colors.gray400, marginTop: 16, marginBottom: 6 },
  card: { backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray100, borderRadius: 6, padding: 14, marginBottom: 4 },
  cardTitle: { fontSize: 14, color: colors.gray900 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  comingSoon: { fontSize: 12, color: colors.gray400 },
  logoutButton: {
    marginTop: 20,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
  },
  logoutText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
})
