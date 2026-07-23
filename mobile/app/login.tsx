import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
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
      <View style={styles.videoWrapper} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
        <VideoView style={styles.video} player={player} nativeControls={false} contentFit="cover" />
      </View>
      <LinearGradient
        colors={['transparent', 'rgba(20,10,35,0.55)', 'rgba(10,6,20,0.92)', '#0A0A0F']}
        locations={[0, 0.55, 0.78, 1]}
        style={styles.gradient}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(139,47,201,0.35)', 'transparent']}
        style={styles.glow}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardWrapper}
      >
        <View style={[styles.form, { bottom: insets.bottom + 24 }]}>
          <AuthTextInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <AuthTextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
            accessibilityState={{ disabled: loading, busy: loading }}
          >
            <Text style={styles.buttonText}>{loading ? 'A entrar...' : 'Entrar'}</Text>
          </Pressable>

          <Link href="/signup" style={styles.link} accessibilityRole="link">
            <Text style={styles.linkText}>Ainda não tens conta? Criar conta</Text>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const fill = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  videoWrapper: { position: 'absolute', top: 0, left: 0, right: 0, height: '70%', overflow: 'hidden' },
  video: { position: 'absolute', top: 0, bottom: 0, left: '-25%', right: '-25%' },
  gradient: { ...fill },
  glow: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  keyboardWrapper: { ...fill },
  form: { position: 'absolute', left: 24, right: 24, gap: 14 },
  error: { color: '#FCA5A5', fontSize: 13 },
  button: {
    backgroundColor: '#F5F3FA',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#8B2FC9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonText: { color: '#14081F', fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },
  link: { marginTop: 22, alignItems: 'center' },
  linkText: { color: 'rgba(245,243,250,0.55)', fontSize: 13 },
})
