import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter, Link } from 'expo-router'
import { useVideoPlayer, VideoView } from 'expo-video'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { AuthTextInput } from '../components/AuthTextInput'
import { QUIC_MAGENTA, colors } from '../lib/theme'

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
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('Credenciais inválidas')
        return
      }
      router.replace('/(tabs)')
    } catch {
      setError('Erro de ligação. Tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['transparent', colors.authScreen.overlayNear, colors.authScreen.overlayFar, colors.authScreen.background]}
        locations={[0, 0.55, 0.78, 1]}
        style={styles.gradient}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
      />
      <View style={styles.videoWrapper} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
        <VideoView style={styles.videoZoomOut} player={player} nativeControls={false} contentFit="cover" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardWrapper}
      >
        <View style={[styles.form, { bottom: insets.bottom + 24 }]}>
          <AuthTextInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <AuthTextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Entrar"
            accessibilityState={{ disabled: loading, busy: loading }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
  container: { flex: 1, backgroundColor: colors.authScreen.background },
  videoWrapper: { ...fill, overflow: 'hidden' },
  videoZoomOut: { position: 'absolute', top: 0, bottom: 0, left: '-7.5%', right: '-7.5%' },
  gradient: { ...fill },
  keyboardWrapper: { ...fill },
  form: { position: 'absolute', left: 24, right: 24, gap: 14 },
  error: { color: colors.dangerOnDark, fontSize: 13 },
  button: {
    backgroundColor: QUIC_MAGENTA,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonPressed: {
    opacity: 0.8,
    shadowColor: QUIC_MAGENTA,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },
  link: { marginTop: 22, alignItems: 'center' },
  linkText: { color: colors.authScreen.linkText, fontSize: 13 },
})
