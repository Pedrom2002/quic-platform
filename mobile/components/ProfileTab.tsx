// mobile/components/ProfileTab.tsx
import { useEffect, useRef, useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, QUIC_MAGENTA } from '../lib/theme'
import { supabase } from '../lib/supabase'
import { fetchInvestorProfile, updateInvestorProfile, type InvestorProfile } from '../lib/investorProfile'

type ProfileFetchState =
  | { status: 'loading' }
  | { status: 'loaded'; profile: InvestorProfile }
  | { status: 'error' }

type SaveState = 'idle' | 'saving' | 'error' | 'success'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

export function ProfileTab({ investorId, email, status }: { investorId: string; email: string; status: 'approved' }) {
  const [fetchState, setFetchState] = useState<ProfileFetchState>({ status: 'loading' })
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const successTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (successTimeout.current) clearTimeout(successTimeout.current)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setFetchState({ status: 'loading' })
    fetchInvestorProfile(supabase, investorId)
      .then(profile => {
        if (!cancelled) {
          setFetchState({ status: 'loaded', profile })
          setFullName(profile.fullName)
          setPhone(profile.phone ?? '')
        }
      })
      .catch(() => { if (!cancelled) setFetchState({ status: 'error' }) })
    return () => { cancelled = true }
  }, [investorId])

  async function handleSave() {
    setSaveState('saving')
    setErrorMessage(null)
    const result = await updateInvestorProfile(supabase, investorId, { fullName, phone: phone || null })
    if (result.error) {
      setSaveState('error')
      setErrorMessage(result.error)
    } else {
      setSaveState('success')
      if (successTimeout.current) clearTimeout(successTimeout.current)
      successTimeout.current = setTimeout(() => setSaveState('idle'), 3000)
    }
  }

  if (fetchState.status === 'loading') {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator color={QUIC_MAGENTA} />
      </View>
    )
  }

  if (fetchState.status === 'error') {
    return (
      <View style={styles.stateContainer}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.gray300} />
        <Text style={styles.stateBody}>Não foi possível carregar o teu perfil. Tenta novamente mais tarde.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.infoCard}>
        <View style={styles.infoField}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{email}</Text>
        </View>
        <View style={styles.infoField}>
          <Text style={styles.infoLabel}>Estado</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{statusLabel(status)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.formField}>
          <Text style={styles.formLabel}>Nome completo</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
          />
        </View>
        <View style={styles.formField}>
          <Text style={styles.formLabel}>Telefone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        {saveState === 'error' && errorMessage && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}
        {saveState === 'success' && (
          <Text style={styles.successText}>Alterações guardadas.</Text>
        )}

        <Pressable
          style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]}
          onPress={handleSave}
          disabled={saveState === 'saving'}
          accessibilityRole="button"
        >
          <Text style={styles.saveButtonText}>{saveState === 'saving' ? 'A guardar...' : 'Guardar'}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  stateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  stateBody: { color: colors.gray500, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 16,
    gap: 24,
  },
  infoField: { flex: 1, gap: 4 },
  infoLabel: { color: colors.gray500, fontSize: 11 },
  infoValue: { color: colors.gray900, fontSize: 13, fontWeight: '600' },
  statusBadge: { alignSelf: 'flex-start', backgroundColor: colors.gray200, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: '600', color: colors.gray700 },
  form: { gap: 12 },
  formField: { gap: 4 },
  formLabel: { color: colors.gray700, fontSize: 13, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.gray900,
  },
  errorText: { color: colors.danger, fontSize: 13 },
  successText: { color: colors.success, fontSize: 13 },
  saveButton: {
    backgroundColor: colors.brand,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonPressed: { opacity: 0.85 },
  saveButtonText: { color: colors.white, fontSize: 14, fontWeight: '600' },
})
