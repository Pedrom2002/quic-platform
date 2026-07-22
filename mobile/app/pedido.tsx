// mobile/app/pedido.tsx
import { useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useCart } from '../hooks/useCart'
import { supabase } from '../lib/supabase'
import { validateQuote, submitQuote } from '../lib/quote'

export default function PedidoScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { items, isReady, setQty, removeItem, clear } = useCart()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setError(null)
    const form = { name, email, phone, eventDate, message }
    const lines = items.map(i => ({ materialId: i.materialId, qty: i.qty }))
    const validationError = validateQuote(form, lines)
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    const result = await submitQuote(supabase, form, lines)
    setSubmitting(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    clear()
    Alert.alert('Pedido enviado', 'Respondemos com um orçamento sem compromisso.')
    router.replace('/(tabs)/catalogo')
  }

  if (isReady && items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>O teu pedido está vazio</Text>
        <Text style={styles.emptyText}>Adiciona materiais no catálogo para pedir um orçamento.</Text>
        <Pressable style={styles.emptyButton} onPress={() => router.replace('/(tabs)/catalogo')} accessibilityRole="button">
          <Text style={styles.emptyButtonText}>Ver catálogo</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
      <Text style={styles.heading}>Pedido de orçamento</Text>

      <Text style={styles.sectionLabel}>Materiais</Text>
      {items.map(item => (
        <View key={item.materialId} style={styles.itemRow}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemUnit}>Unidade: {item.unit}</Text>
          </View>
          <Pressable
            style={styles.qtyButton}
            onPress={() => setQty(item.materialId, item.qty - 1)}
            accessibilityRole="button"
            accessibilityLabel={`Diminuir quantidade de ${item.name}`}
          >
            <Text style={styles.qtyButtonText}>−</Text>
          </Pressable>
          <Text style={styles.qtyValue}>{item.qty}</Text>
          <Pressable
            style={styles.qtyButton}
            onPress={() => setQty(item.materialId, item.qty + 1)}
            accessibilityRole="button"
            accessibilityLabel={`Aumentar quantidade de ${item.name}`}
          >
            <Text style={styles.qtyButtonText}>+</Text>
          </Pressable>
          <Pressable
            style={styles.removeButton}
            onPress={() => removeItem(item.materialId)}
            accessibilityRole="button"
            accessibilityLabel={`Remover ${item.name}`}
          >
            <Text style={styles.removeButtonText}>Remover</Text>
          </Pressable>
        </View>
      ))}

      <Text style={styles.sectionLabel}>Os teus dados</Text>
      <TextInput style={styles.input} placeholder="Nome *" placeholderTextColor="#a8a29e" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Email *" placeholderTextColor="#a8a29e" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Telefone (opcional)" placeholderTextColor="#a8a29e" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Data do evento (AAAA-MM-DD, opcional)" placeholderTextColor="#a8a29e" value={eventDate} onChangeText={setEventDate} />
      <TextInput style={[styles.input, styles.messageInput]} placeholder="Mensagem (opcional)" placeholderTextColor="#a8a29e" value={message} onChangeText={setMessage} multiline />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={submitting} accessibilityRole="button">
        <Text style={styles.submitButtonText}>{submitting ? 'A enviar...' : 'Enviar pedido'}</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  heading: { fontSize: 24, fontWeight: '800', color: '#1c1917', paddingHorizontal: 20, paddingTop: 20 },
  sectionLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#a8a29e', paddingHorizontal: 20, marginTop: 20, marginBottom: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 8 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#1c1917' },
  itemUnit: { fontSize: 12, color: '#78716c' },
  qtyButton: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f0efee', justifyContent: 'center', alignItems: 'center' },
  qtyButtonText: { fontSize: 18, color: '#1c1917', fontWeight: '600' },
  qtyValue: { minWidth: 24, textAlign: 'center', fontSize: 14, color: '#1c1917' },
  removeButton: { paddingHorizontal: 8, paddingVertical: 4 },
  removeButtonText: { fontSize: 12, color: '#b91c1c', fontWeight: '600' },
  input: { marginHorizontal: 20, marginBottom: 10, backgroundColor: '#f5f5f4', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1c1917' },
  messageInput: { minHeight: 100, textAlignVertical: 'top' },
  error: { color: '#b91c1c', fontSize: 13, paddingHorizontal: 20, marginBottom: 8 },
  submitButton: { marginHorizontal: 20, marginTop: 8, backgroundColor: '#111111', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  emptyContainer: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1c1917' },
  emptyText: { fontSize: 14, color: '#78716c', textAlign: 'center' },
  emptyButton: { marginTop: 12, backgroundColor: '#111111', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  emptyButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
})
