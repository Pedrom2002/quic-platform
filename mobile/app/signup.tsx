import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter, Link } from 'expo-router'
import { useVideoPlayer, VideoView } from 'expo-video'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { AuthTextInput } from '../components/AuthTextInput'
import { QUIC_MAGENTA, colors } from '../lib/theme'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function SignupScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const player = useVideoPlayer(require('../assets/videos/intro_2_109.mp4'), p => {
    p.loop = true
    p.muted = true
    p.play()
  })

  function validate(): string | null {
    if (!email.trim()) return 'Introduz o teu email'
    if (!EMAIL_REGEX.test(email.trim())) return 'Email inválido'
    if (password.length < 6) return 'A password precisa de pelo menos 6 caracteres'
    if (password !== confirmPassword) return 'As passwords não coincidem'
    return null
  }

  async function handleSignup() {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({ email: email.trim(), password })
      if (error) {
        setError(
          error.message === 'User already registered'
            ? 'Este email já está registado'
            : 'Erro ao criar conta'
        )
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
          <AuthTextInput placeholder="Confirmar password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleSignup}
            disabled={loading}
            accessibilityRole="button"
            accessibilityState={{ disabled: loading, busy: loading }}
          >
            <Text style={styles.buttonText}>{loading ? 'A criar...' : 'Criar conta'}</Text>
          </Pressable>

          <Link href="/login" style={styles.link} accessibilityRole="link">
            <Text style={styles.linkText}>Já tens conta? Entrar</Text>
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
    shadowColor: QUIC_MAGENTA,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },
  link: { marginTop: 22, alignItems: 'center' },
  linkText: { color: colors.authScreen.linkText, fontSize: 13 },
})
