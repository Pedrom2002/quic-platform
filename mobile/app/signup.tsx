import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter, Link } from 'expo-router'
import { supabase } from '../lib/supabase'
import { AuthTextInput } from '../components/AuthTextInput'

export default function SignupScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSignup() {
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) {
      setError(
        error.message === 'User already registered'
          ? 'Este email já está registado'
          : 'Erro ao criar conta'
      )
      return
    }
    router.replace('/(tabs)')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.wordmark}>QUIC</Text>
      <Text style={styles.tagline}>No Stage Is Too Big</Text>

      <View style={styles.form}>
        <AuthTextInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <AuthTextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.button} onPress={handleSignup} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'A criar...' : 'Criar conta'}</Text>
        </Pressable>

        <Link href="/login" style={styles.link}>
          <Text style={styles.linkText}>Já tens conta? Entrar</Text>
        </Link>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111', justifyContent: 'center', paddingHorizontal: 24 },
  wordmark: { color: '#ffffff', fontSize: 32, fontWeight: 'bold', textAlign: 'center', letterSpacing: 2 },
  tagline: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginTop: 8,
    marginBottom: 40,
  },
  form: { gap: 12 },
  error: { color: '#f87171', fontSize: 13 },
  button: { backgroundColor: '#ffffff', borderRadius: 4, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#111111', fontWeight: '600', fontSize: 14 },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
})
