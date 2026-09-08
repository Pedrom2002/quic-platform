// mobile/app/(tabs)/mais.tsx
import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, Pressable, Alert, StyleSheet, ScrollView, Linking } from 'react-native'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { useSession } from '../../hooks/useSession'
import { displayArtistName } from '../../lib/artistName'
import { resolveUserRole, type UserRole } from '../../lib/role'
import { supabase } from '../../lib/supabase'
import { QUIC_MAGENTA, colors } from '../../lib/theme'
import { BannerHeader } from '../../components/BannerHeader'
import { deleteOwnAccount } from '../../lib/accountDeletion'

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

  function handleDeleteAccount() {
    // Dupla confirmacao: eliminar conta e irreversivel (remove tambem o
    // historico de bilhetes associado ao titular, ver 0067_account_deletion.sql).
    Alert.alert(
      'Eliminar conta',
      'Esta ação é irreversível. Os teus dados pessoais serão apagados e não vais conseguir recuperar a conta.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Tens a certeza absoluta?',
              'Vais perder o acesso à conta e aos bilhetes associados a ela.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Eliminar conta',
                  style: 'destructive',
                  onPress: async () => {
                    const { data } = await supabase.auth.getSession()
                    const accessToken = data.session?.access_token
                    if (!accessToken) {
                      Alert.alert('Erro', 'Sessão inválida. Tenta iniciar sessão de novo.')
                      return
                    }
                    const result = await deleteOwnAccount(process.env.EXPO_PUBLIC_APP_URL!, accessToken)
                    if (!result.success) {
                      Alert.alert('Erro', result.error)
                      return
                    }
                    await supabase.auth.signOut()
                  },
                },
              ]
            )
          },
        },
      ]
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <BannerHeader source={require('../../assets/banners/mais.png')} />
      <View style={styles.nameBlock}>
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
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push('/tickets')}
          accessibilityRole="button"
        >
          <Text style={styles.cardTitle}>Os meus bilhetes</Text>
        </Pressable>
        {role.role === 'staff' && (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.push('/scanner')}
            accessibilityRole="button"
          >
            <Text style={styles.cardTitle}>Scanner de check-in</Text>
          </Pressable>
        )}

        <Text style={styles.sectionLabel}>Definições</Text>
        <View style={[styles.card, styles.cardDisabled]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.cardTitle, styles.cardTitleDisabled]}>Notificações</Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Em breve</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Suporte</Text>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => Linking.openURL('mailto:geral@quic.pt?subject=Suporte%20QUIC%20App')}
          accessibilityRole="button"
        >
          <Text style={styles.cardTitle}>Contactar suporte</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>Legal</Text>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => Linking.openURL('https://quic.pt/privacy-policy')}
          accessibilityRole="button"
        >
          <Text style={styles.cardTitle}>Política de Privacidade</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => Linking.openURL('https://quic.pt/terms')}
          accessibilityRole="button"
        >
          <Text style={styles.cardTitle}>Termos e Condições</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
          onPress={handleSignOut}
          accessibilityRole="button"
        >
          <Text style={styles.logoutText}>Terminar sessão</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.deleteAccountButton, pressed && styles.deleteAccountButtonPressed]}
          onPress={handleDeleteAccount}
          accessibilityRole="button"
        >
          <Text style={styles.deleteAccountText}>Eliminar conta</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

export default function MaisScreen() {
  const { session } = useSession()
  const [role, setRole] = useState<UserRole | null>(null)
  const [roleError, setRoleError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setRoleError(false)
    resolveUserRole(supabase, session)
      .then(r => { if (!cancelled) setRole(r) })
      .catch(() => { if (!cancelled) setRoleError(true) })
    return () => { cancelled = true }
  }, [session])

  // Sem isto, um erro de rede aqui (nao apenas um resultado vazio, que
  // resolveUserRole ja trata como 'guest') deixava o ecra preso no spinner
  // para sempre — nunca havia um catch para sair desse estado.
  if (roleError) {
    return (
      <View style={styles.center}>
        <Text style={styles.restricted}>Não foi possível carregar o teu perfil. Tenta novamente mais tarde.</Text>
      </View>
    )
  }

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
  container: { flex: 1, backgroundColor: colors.white },
  scrollContent: { flexGrow: 1 },
  center: { flex: 1, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center' },
  restricted: { color: colors.gray600, fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  nameBlock: { paddingHorizontal: 24, paddingVertical: 20 },
  name: { color: colors.gray900, fontSize: 20, fontWeight: 'bold' },
  subtitle: { color: colors.gray500, fontSize: 12, marginTop: 2 },
  body: { padding: 16 },
  sectionLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: colors.gray500, marginTop: 16, marginBottom: 6 },
  card: { backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray100, borderRadius: 6, padding: 14, marginBottom: 4 },
  cardPressed: { backgroundColor: colors.gray100 },
  cardDisabled: { opacity: 0.6 },
  cardTitle: { fontSize: 14, color: colors.gray900 },
  cardTitleDisabled: { color: colors.gray500 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  comingSoonBadge: { backgroundColor: colors.gray100, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  comingSoonText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.gray500 },
  logoutButton: {
    marginTop: 20,
    backgroundColor: colors.dangerBackground,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
  },
  logoutButtonPressed: { backgroundColor: colors.dangerBorder },
  logoutText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  deleteAccountButton: { marginTop: 10, padding: 14, alignItems: 'center' },
  deleteAccountButtonPressed: { opacity: 0.6 },
  deleteAccountText: { color: colors.gray500, fontSize: 13, textDecorationLine: 'underline' },
})
