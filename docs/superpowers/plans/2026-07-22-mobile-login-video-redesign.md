# App mobile Quic: redesign do login com vídeo de fundo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o fundo sólido do login por um vídeo em loop com gradiente, remover a wordmark "QUIC" duplicada, e ancorar o formulário na parte inferior.

**Architecture:** `expo-video` reproduz `mobile/assets/videos/intro_2_109.mp4` (copiado de `public/`) em loop/mudo, `expo-linear-gradient` sobrepõe um gradiente para legibilidade, o formulário existente passa de centrado para ancorado em baixo via `useSafeAreaInsets`.

**Tech Stack:** Expo Router, `expo-video`, `expo-linear-gradient` (já instalada), Jest + `@testing-library/react-native`.

---

### Task 1: Instalar `expo-video` e copiar o vídeo

**Files:**
- Modify: `mobile/package.json`, `mobile/package-lock.json` (via `expo install`)
- Create: `mobile/assets/videos/intro_2_109.mp4`

- [ ] **Step 1: Instalar a dependência**

Run: `cd mobile && npx expo install expo-video`
Expected: adiciona `expo-video` ao `package.json` com a versão compatível do SDK 57.

- [ ] **Step 2: Copiar o vídeo**

Run: `mkdir -p mobile/assets/videos && cp public/intro_2_109.mp4 mobile/assets/videos/intro_2_109.mp4` (a partir da raiz do repo, `c:\Users\P02\Downloads\quic-plat`)
Expected: ficheiro `mobile/assets/videos/intro_2_109.mp4` existe (10.3MB).

- [ ] **Step 3: Commit**

```bash
git add mobile/package.json mobile/package-lock.json mobile/assets/videos/intro_2_109.mp4
git commit -m "chore(mobile): instala expo-video e copia video de intro para o login"
```

---

### Task 2: Redesenhar `mobile/app/login.tsx`

**Files:**
- Modify: `mobile/app/login.tsx`
- Modify: `mobile/__tests__/app/login.test.tsx`

- [ ] **Step 1: Ler o ficheiro atual**

Ficheiro atual (`mobile/app/login.tsx`):
```tsx
import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter, Link } from 'expo-router'
import { supabase } from '../lib/supabase'
import { AuthTextInput } from '../components/AuthTextInput'

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
      <Text style={styles.wordmark}>QUIC</Text>
      <Text style={styles.tagline}>No Stage Is Too Big</Text>

      <View style={styles.form}>
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
```

- [ ] **Step 2: Escrever o teste que falha primeiro (adicionar mocks no topo do ficheiro existente)**

Modificar `mobile/__tests__/app/login.test.tsx`: adicionar estes 3 blocos `jest.mock` no topo do ficheiro, antes de `import LoginScreen from '../../app/login'` (o resto do ficheiro, os 2 testes existentes, não muda):

```tsx
jest.mock('expo-video', () => ({
  useVideoPlayer: () => ({ loop: false, muted: false, play: jest.fn() }),
  VideoView: () => null,
}))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => children ?? null,
}))
```

- [ ] **Step 3: Correr e confirmar falha**

Run: `cd mobile && npx jest --runInBand login.test.tsx`
Expected: FAIL, `Cannot find module 'expo-video'` (dependência ainda não instalada nesta fase, ou os testes passam já com os mocks e o objetivo deste passo é confirmar a baseline antes do redesign — se passar sem erro, prossegue para o Step 4 na mesma).

- [ ] **Step 4: Implementar o redesign**

Substituir `mobile/app/login.tsx` por:

```tsx
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
```

Nota: `styles.wordmark`/`styles.tagline` foram removidos (elementos correspondentes já não existem no JSX). Usa o objeto local `fill` para posicionamento absoluto (não `StyleSheet.absoluteFillObject`/`absoluteFill` — API que já causou um bug real de layout quebrado noutra parte deste projeto, ver `mobile/components/EventCard.tsx` para o padrão correto já corrigido).

- [ ] **Step 5: Correr e confirmar sucesso**

Run: `cd mobile && npx jest --runInBand login.test.tsx`
Expected: PASS (2 testes)

- [ ] **Step 6: Correr toda a suite mobile**

Run: `cd mobile && npx jest --runInBand`
Expected: PASS em tudo

- [ ] **Step 7: Confirmar tsc limpo no ficheiro de produção**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep -i "app/login.tsx"`
Expected: sem output (zero erros em `login.tsx`; erros em `login.test.tsx` do tipo `TS2345 ... never` são o padrão pré-existente já confirmado no projeto, não bloqueiam).

- [ ] **Step 8: Verificar que o bundle continua a exportar**

Run: `cd mobile && npx expo export --platform ios`
Expected: sucesso, sem erros. Depois: `rm -rf mobile/dist`

- [ ] **Step 9: Commit**

```bash
git add mobile/app/login.tsx mobile/__tests__/app/login.test.tsx
git commit -m "feat(mobile): login com video de fundo em loop e formulario ancorado em baixo"
```

---

### Task 3: Verificação manual

**Files:** nenhum (checkpoint manual)

- [ ] **Step 1: Arrancar a app**

Run: `cd mobile && npx expo start -c`

- [ ] **Step 2: Confirmar visualmente**

No ecrã de login: vídeo reproduz em loop, sem som, cobre o ecrã inteiro. Gradiente escurece progressivamente para baixo. Sem wordmark/tagline "QUIC" visível como texto (só a marca já presente no vídeo). Formulário (email/password/botão/link) ancorado na parte inferior, legível sobre o gradiente. Login funciona normalmente (credenciais erradas mostram erro, corretas navegam para as tabs).

---

## Fora de escopo (relembrando do spec)

Redesign do signup, compressão do vídeo, fallback de imagem estática.
