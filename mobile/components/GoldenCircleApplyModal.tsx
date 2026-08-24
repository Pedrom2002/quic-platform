import { useState } from 'react'
import { Modal, View, Text, TextInput, Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { applyForGoldenCircle } from '../lib/goldenCircleApply'
import { colors } from '../lib/theme'

export function GoldenCircleApplyModal({
  visible,
  onClose,
  authUserId,
  email,
  defaultFullName,
}: {
  visible: boolean
  onClose: () => void
  authUserId: string
  email: string
  defaultFullName: string
}) {
  const insets = useSafeAreaInsets()
  const [fullName, setFullName] = useState(defaultFullName)
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)
    const result = await applyForGoldenCircle(supabase, authUserId, {
      fullName,
      email,
      phone: phone.trim() || null,
    })
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSubmitted(true)
  }

  function handleClose() {
    setSubmitted(false)
    setError(null)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          {submitted ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle-outline" size={40} color={colors.success} />
              <Text style={styles.successTitle}>Pedido enviado</Text>
              <Text style={styles.successBody}>
                A nossa equipa vai rever o teu pedido de acesso ao Golden Circle. Entramos em
                contacto assim que houver uma decisão.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.submitButton, pressed && styles.submitButtonPressed]}
                onPress={handleClose}
                accessibilityRole="button"
              >
                <Text style={styles.submitButtonText}>Fechar</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Pedir acesso ao Golden Circle</Text>
                <Pressable
                  onPress={handleClose}
                  accessibilityRole="button"
                  accessibilityLabel="Fechar"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color={colors.gray900} />
                </Pressable>
              </View>

              <Text style={styles.formLabel}>Nome completo</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                accessibilityLabel="Nome completo"
                maxLength={200}
              />

              <Text style={styles.formLabel}>Telefone (opcional)</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                accessibilityLabel="Telefone"
                maxLength={30}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <Pressable
                style={({ pressed }) => [styles.submitButton, pressed && styles.submitButtonPressed]}
                onPress={handleSubmit}
                disabled={submitting}
                accessibilityRole="button"
              >
                <Text style={styles.submitButtonText}>{submitting ? 'A enviar...' : 'Enviar pedido'}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '700', color: colors.gray900 },
  formLabel: { fontSize: 13, fontWeight: '500', color: colors.gray700, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.gray900,
  },
  error: { color: colors.danger, fontSize: 13 },
  submitButton: { marginTop: 8, backgroundColor: colors.gold, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitButtonPressed: { opacity: 0.85 },
  submitButtonText: { color: '#0d0c0d', fontSize: 15, fontWeight: '700' },
  successContainer: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  successTitle: { fontSize: 17, fontWeight: '700', color: colors.gray900 },
  successBody: { fontSize: 13, color: colors.gray500, textAlign: 'center', lineHeight: 20 },
})
