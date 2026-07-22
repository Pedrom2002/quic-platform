import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter, Link } from 'expo-router'
import { useVideoPlayer, VideoView } from 'expo-video'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { AuthTextInput } from '../components/AuthTextInput'

export default function LoginScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const player = useVideoPlayer(require('../assets/videos/intro_2_109.mp4'), p => {
    p.loop = true
    p.muted = true
    p.play()
  })

  async function handleLogin() {
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError('Credenciais inválidas')
      return
    }
    router.replace('/(tabs)')
  }

  return (
    <View style={styles.container}>
      <VideoView style={styles.video} player={player} nativeControls={false} contentFit="cover" />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        locations={[0, 0.7]}
        style={styles.gradient}
      />

      <View style={[styles.form, { bottom: insets.bottom + 24 }]}>
        <AuthTextInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <AuthTextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'A entrar...' : 'Entrar'}</Text>
        </Pressable>

        <Link href="/signup" style={styles.link}>
          <Text style={styles.linkText}>Ainda não tens conta? Criar conta</Text>
        </Link>
      </View>
    </View>
  )
}

const fill = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111' },
  video: { ...fill },
  gradient: { ...fill },
  form: { position: 'absolute', left: 24, right: 24, gap: 12 },
  error: { color: '#f87171', fontSize: 13 },
  button: { backgroundColor: '#ffffff', borderRadius: 4, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#111111', fontWeight: '600', fontSize: 14 },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
})
