# App mobile Quic: tab "Mais" (perfil, sobre, definições, logout) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o placeholder da tab "Mais" por um ecrã real com dados do utilizador autenticado, informação estática sobre a app, secção de definições (placeholder visual, sem função) e botão para terminar sessão com confirmação.

**Architecture:** Ecrã único `mobile/app/(tabs)/mais.tsx`, sem sub-navegação. Usa `useSession` + `resolveUserRole` (já existentes) para os dados do utilizador, `expo-constants` para a versão da app, e `supabase.auth.signOut()` (via `Alert.alert` de confirmação) para logout. Sem fetch novo à base de dados.

**Tech Stack:** Expo Router, `@supabase/supabase-js`, `expo-constants`, `react-native` (`Alert`), Jest + `@testing-library/react-native`.

---

## Nota sobre localização de testes (regra crítica deste projeto, repetida várias vezes)

Ficheiros `.test.tsx` que testam ecrãs sob `mobile/app/` NUNCA vivem dentro de `mobile/app/` — Expo Router trata todo ficheiro sob `app/` como rota potencial, e um teste com `@testing-library/react-native` quebra `npx expo export --platform ios`. O teste deste plano vai em `mobile/__tests__/app/(tabs)/mais.test.tsx`.

## Nota sobre o "nome" do utilizador

`resolveUserRole` (`mobile/lib/role.ts`) não devolve nome para `client`/`guest` — só `artist.name` (artistas) e `member.full_name` (staff). O signup mobile (`mobile/app/signup.tsx`) só regista email/password, sem `user_metadata.full_name`. Por isso o nome de exibição é derivado assim: artista → `role.artist.name`; staff → `role.member.full_name`; cliente/convidado → `session.user.email` (usado como "nome" já que não há outro identificador). O email só é mostrado como segunda linha quando é diferente do valor já usado como nome (evita duplicar `pedro@x.com` / `pedro@x.com`).

---

### Task 1: `mobile/app/(tabs)/mais.tsx` com dados reais

**Files:**
- Modify: `mobile/app/(tabs)/mais.tsx`
- Create: `mobile/__tests__/app/(tabs)/mais.test.tsx`

- [ ] **Step 1: Ler o ecrã atual (placeholder) para confirmar o que está a ser substituído**

Ficheiro atual (`mobile/app/(tabs)/mais.tsx`):
```tsx
import { PlaceholderScreen } from '../../components/PlaceholderScreen'

export default function MaisScreen() {
  return <PlaceholderScreen title="Mais" message="Sobre, contacto e definições" />
}
```

- [ ] **Step 2: Escrever o teste que falha primeiro**

```tsx
// mobile/__tests__/app/(tabs)/mais.test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { Alert } from 'react-native'
import MaisScreen from '../../../app/(tabs)/mais'

const mockUseSession = jest.fn()
const mockResolveUserRole = jest.fn()
const mockSignOut = jest.fn()

jest.mock('../../../hooks/useSession', () => ({ useSession: () => mockUseSession() }))
jest.mock('../../../lib/role', () => ({ resolveUserRole: (...args: unknown[]) => mockResolveUserRole(...args) }))
jest.mock('../../../lib/supabase', () => ({
  supabase: { auth: { signOut: (...args: unknown[]) => mockSignOut(...args) } },
}))
jest.mock('expo-constants', () => ({ expoConfig: { version: '1.0.0' } }))

beforeEach(() => {
  mockUseSession.mockReset()
  mockResolveUserRole.mockReset()
  mockSignOut.mockReset()
  mockSignOut.mockResolvedValue({ error: null })
  jest.spyOn(Alert, 'alert').mockImplementation(() => {})
})

describe('MaisScreen', () => {
  it('shows artist name, email and translated role', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1', email: 'artista@x.com' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({
      role: 'artist',
      artist: { id: 'a1', name: 'Maria Silva', photo_url: null, bio: null },
    })

    const { getByText } = render(<MaisScreen />)

    await waitFor(() => {
      expect(getByText('Maria Silva')).toBeTruthy()
    })
    expect(getByText('artista@x.com · Artista')).toBeTruthy()
  })

  it('shows email as name for client role without duplicating it', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u2', email: 'cliente@x.com' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client' })

    const { getByText, queryByText } = render(<MaisScreen />)

    await waitFor(() => {
      expect(getByText('cliente@x.com')).toBeTruthy()
    })
    expect(queryByText('cliente@x.com · Cliente')).toBeNull()
    expect(getByText('Cliente')).toBeTruthy()
  })

  it('shows the app version from expo-constants', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1', email: 'a@x.com' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client' })

    const { getByText } = render(<MaisScreen />)

    await waitFor(() => {
      expect(getByText('Versão 1.0.0')).toBeTruthy()
    })
  })

  it('shows confirmation alert on logout tap without signing out yet', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1', email: 'a@x.com' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client' })

    const { getByText } = render(<MaisScreen />)
    await waitFor(() => expect(getByText('Terminar sessão')).toBeTruthy())

    fireEvent.press(getByText('Terminar sessão'))

    expect(Alert.alert).toHaveBeenCalledWith(
      'Terminar sessão',
      'Tens a certeza que queres terminar sessão?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancelar', style: 'cancel' }),
        expect.objectContaining({ text: 'Terminar sessão', style: 'destructive' }),
      ])
    )
    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it('calls signOut when the destructive alert button is confirmed', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1', email: 'a@x.com' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client' })
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const destructive = buttons?.find(b => b.style === 'destructive')
      destructive?.onPress?.()
    })

    const { getByText } = render(<MaisScreen />)
    await waitFor(() => expect(getByText('Terminar sessão')).toBeTruthy())

    fireEvent.press(getByText('Terminar sessão'))

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  it('shows error alert when signOut fails', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1', email: 'a@x.com' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client' })
    mockSignOut.mockRejectedValue(new Error('network down'))
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const destructive = buttons?.find(b => b.style === 'destructive')
      destructive?.onPress?.()
    })

    const { getByText } = render(<MaisScreen />)
    await waitFor(() => expect(getByText('Terminar sessão')).toBeTruthy())

    fireEvent.press(getByText('Terminar sessão'))

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Erro', 'Não foi possível terminar sessão. Tenta novamente.')
    })
  })
})
```

- [ ] **Step 3: Correr e confirmar falha**

Run: `cd mobile && npx jest --runInBand "__tests__/app/(tabs)/mais.test.tsx"`
Expected: FAIL (o componente atual é só o `PlaceholderScreen`, não tem nenhum dos textos/comportamentos testados)

- [ ] **Step 4: Implementar**

```tsx
// mobile/app/(tabs)/mais.tsx
import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, Pressable, Alert, StyleSheet } from 'react-native'
import Constants from 'expo-constants'
import { useSession } from '../../hooks/useSession'
import { resolveUserRole, type UserRole } from '../../lib/role'
import { supabase } from '../../lib/supabase'

function roleLabel(role: UserRole): string {
  if (role.role === 'artist') return 'Artista'
  if (role.role === 'staff') return 'Staff'
  if (role.role === 'client') return 'Cliente'
  return 'Convidado'
}

function displayName(role: UserRole, email: string): string {
  if (role.role === 'artist') return role.artist.name
  if (role.role === 'staff') return role.member.full_name
  return email
}

function MaisContent({ role, email }: { role: UserRole; email: string }) {
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

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.slice(0, 2).toUpperCase()}</Text>
        </View>
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

        <Text style={styles.sectionLabel}>Definições</Text>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Notificações</Text>
            <Text style={styles.comingSoon}>Em breve</Text>
          </View>
        </View>

        <Pressable style={styles.logoutButton} onPress={handleSignOut}>
          <Text style={styles.logoutText}>Terminar sessão</Text>
        </Pressable>
      </View>
    </View>
  )
}

export default function MaisScreen() {
  const { session } = useSession()
  const [role, setRole] = useState<UserRole | null>(null)

  useEffect(() => {
    resolveUserRole(supabase, session).then(setRole)
  }, [session])

  if (!role || !session) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#111111" />
      </View>
    )
  }

  return <MaisContent role={role} email={session.user.email ?? ''} />
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
  hero: { backgroundColor: '#111111', paddingHorizontal: 24, paddingVertical: 32 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  name: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  body: { padding: 16 },
  sectionLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#a8a29e', marginTop: 16, marginBottom: 6 },
  card: { backgroundColor: '#fafaf9', borderWidth: 1, borderColor: '#f5f5f4', borderRadius: 6, padding: 14, marginBottom: 4 },
  cardTitle: { fontSize: 14, color: '#1c1917' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  comingSoon: { fontSize: 12, color: '#a8a29e' },
  logoutButton: {
    marginTop: 20,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#b91c1c', fontSize: 14, fontWeight: '600' },
})
```

- [ ] **Step 5: Correr e confirmar sucesso**

Run: `cd mobile && npx jest --runInBand "__tests__/app/(tabs)/mais.test.tsx"`
Expected: PASS (todos os 6 testes)

- [ ] **Step 6: Correr toda a suite mobile**

Run: `cd mobile && npx jest --runInBand`
Expected: PASS em tudo (usar `--runInBand`, este projeto já confirmou flakiness sob execução paralela nesta máquina)

- [ ] **Step 7: Verificar que o bundle continua a exportar**

Run: `cd mobile && npx expo export --platform ios`
Expected: sucesso, sem erros

Depois: `rm -rf mobile/dist`

- [ ] **Step 8: Commit**

```bash
git add "mobile/app/(tabs)/mais.tsx" "mobile/__tests__/app/(tabs)/mais.test.tsx"
git commit -m "feat(mobile): tab Mais com perfil, sobre, definicoes e logout"
```

---

### Task 2: Verificação manual

**Files:** nenhum (checkpoint manual)

- [ ] **Step 1: Arrancar a app**

Run: `cd mobile && npx expo start`

- [ ] **Step 2: Testar como cliente**

Login com conta cliente. Confirma: hero mostra o email como nome, subtítulo mostra só "Cliente" (sem duplicar o email), secção Sobre mostra nome da plataforma e versão, secção Definições mostra "Notificações · Em breve" sem reagir ao toque.

- [ ] **Step 3: Testar como artista**

Login com conta de artista já convidado (fase 1 do mobile). Confirma: hero mostra o nome do artista, subtítulo mostra "email · Artista".

- [ ] **Step 4: Testar terminar sessão**

Toca em "Terminar sessão". Confirma que aparece o alert de confirmação com "Cancelar" e "Terminar sessão". Toca em "Cancelar" — nada acontece, continuas autenticado. Toca em "Terminar sessão" outra vez e confirma — a app volta ao ecrã de login (o redirect por sessão em `mobile/app/_layout.tsx` já trata disto automaticamente).

---

## Fora de escopo (relembrando do spec)

Edição de perfil, definições funcionais (notificações reais, idioma), contactos/redes sociais reais da QUIC, ecrã de ajuda/suporte/FAQ/termos.
