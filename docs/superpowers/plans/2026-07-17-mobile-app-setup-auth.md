# App mobile Quic: setup + autenticação (fase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o projeto Expo em `/mobile`, com navegação em 4 tabs e autenticação real via Supabase Auth, distinguindo clientes (signup público) de artistas (conta ligada por convite a um registo `artists` existente).

**Architecture:** Migration SQL adiciona `auth_user_id` a `artists` + policy RLS de leitura própria. Server action nova no dashboard web dispara o convite Supabase e liga a conta. App Expo (Expo Router, TypeScript) usa `@supabase/supabase-js` com `AsyncStorage`, resolve o papel do utilizador autenticado consultando `artists`, e mostra tabs com placeholders exceto login/signup/portal (role-aware).

**Tech Stack:** Expo (SDK atual) + Expo Router, `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, TypeScript, Jest + `@testing-library/react-native` (mobile); Next.js Server Actions + vitest com mocks de Supabase (dashboard web, seguindo padrão já existente em `__tests__/artists-server-actions.test.ts`).

---

## Nota sobre testes de integração DB

O repo **não** corre testes contra uma base de dados real: todos os testes de Server Actions usam um Supabase client mockado (ver `__tests__/artists-server-actions.test.ts`). Este plano segue o mesmo padrão: a lógica do convite é testada com mocks; a migration e a policy RLS são verificadas manualmente via SQL Editor (passos exatos na Task 1), não por um suite automatizado.

---

### Task 1: Migration `auth_user_id` em `artists`

**Files:**
- Create: `supabase/migrations/0041_artists_auth_user.sql`

- [ ] **Step 1: Escrever a migration**

```sql
-- Quic Platform: liga artistas a contas Supabase Auth (0041_artists_auth_user)
-- Segue o padrão de 0040: aplicar manualmente via SQL Editor / Management API.
-- NÃO usar `supabase db push` (histórico de migrações partilhado com Stock-Plat).

ALTER TABLE artists ADD COLUMN auth_user_id uuid REFERENCES auth.users(id);
CREATE UNIQUE INDEX idx_artists_auth_user_id ON artists(auth_user_id) WHERE auth_user_id IS NOT NULL;

CREATE POLICY "artist_read_own_artist" ON artists
  FOR SELECT USING (auth_user_id = auth.uid());
```

- [ ] **Step 2: Aplicar manualmente no SQL Editor do projeto Supabase (ambiente de dev/staging)**

Corre o conteúdo do ficheiro no SQL Editor. Confirma sem erros:

```sql
select column_name from information_schema.columns where table_name = 'artists' and column_name = 'auth_user_id';
-- deve devolver 1 linha
select policyname from pg_policies where tablename = 'artists' and policyname = 'artist_read_own_artist';
-- deve devolver 1 linha
```

- [ ] **Step 3: Regenerar tipos TypeScript**

Run: `npm run db:types`
Expected: `types/database.ts` passa a incluir `auth_user_id: string | null` em `artists.Row`. Confirma com:

```bash
grep -n "auth_user_id" types/database.ts
```

Se não houver acesso ao projeto Supabase real neste ambiente, edita `types/database.ts` manualmente: localiza a definição de `artists` em `Tables` e adiciona `auth_user_id: string | null` a `Row`, `Insert` e `Update`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0041_artists_auth_user.sql types/database.ts
git commit -m "feat(db): liga artists a auth.users via auth_user_id"
```

---

### Task 2: Server action de convite (dashboard web)

**Files:**
- Modify: `app/dashboard/artists/actions.ts`
- Test: `__tests__/artists-server-actions.test.ts`

- [ ] **Step 1: Escrever o teste que falha primeiro**

Adicionar ao fim de `__tests__/artists-server-actions.test.ts`:

```ts
describe('inviteArtistToApp', () => {
  it('rejects unauthenticated', async () => {
    mockRequireOrgAuth.mockRejectedValue(new Error('Não autenticado'))
    const { inviteArtistToApp } = await import('@/app/dashboard/artists/actions')
    const result = await inviteArtistToApp(fd({ id: UUID }))
    expect(result.error).toBe('Sem permissões')
  })

  it('rejects invalid id', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { inviteArtistToApp } = await import('@/app/dashboard/artists/actions')
    const result = await inviteArtistToApp(fd({ id: 'nope' }))
    expect(result.error).toBe('Artista inválido')
  })

  it('rejects artist without email', async () => {
    const { supabase, chain } = makeSupabase()
    chain.select = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: { id: UUID, email: null, auth_user_id: null }, error: null }),
      })),
    }))
    authAs(supabase)
    const { inviteArtistToApp } = await import('@/app/dashboard/artists/actions')
    const result = await inviteArtistToApp(fd({ id: UUID }))
    expect(result.error).toBe('Artista sem email definido')
  })

  it('invites and links auth_user_id', async () => {
    const { supabase, chain, calls } = makeSupabase()
    chain.select = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: { id: UUID, email: 'maria@example.com', auth_user_id: null },
          error: null,
        }),
      })),
    }))
    mockInviteUserByEmail.mockResolvedValue({
      data: { user: { id: 'new-auth-user-id' } },
      error: null,
    })
    authAs(supabase)
    const { inviteArtistToApp } = await import('@/app/dashboard/artists/actions')
    const result = await inviteArtistToApp(fd({ id: UUID }))
    expect(result.error).toBeUndefined()
    expect(mockInviteUserByEmail).toHaveBeenCalledWith('maria@example.com')
    const updated = calls.update[0] as Record<string, unknown>
    expect(updated.auth_user_id).toBe('new-auth-user-id')
  })

  it('rejects already-invited artist', async () => {
    const { supabase, chain } = makeSupabase()
    chain.select = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: { id: UUID, email: 'maria@example.com', auth_user_id: 'existing-id' },
          error: null,
        }),
      })),
    }))
    authAs(supabase)
    const { inviteArtistToApp } = await import('@/app/dashboard/artists/actions')
    const result = await inviteArtistToApp(fd({ id: UUID }))
    expect(result.error).toBe('Artista já convidado')
  })
})
```

Adicionar também o mock do admin client e do `inviteUserByEmail` no topo do ficheiro, junto aos outros `vi.hoisted`/`vi.mock`:

```ts
const { mockRequireOrgAuth, mockRevalidate, mockPut, mockInviteUserByEmail } = vi.hoisted(() => ({
  mockRequireOrgAuth: vi.fn(),
  mockRevalidate: vi.fn(),
  mockPut: vi.fn(),
  mockInviteUserByEmail: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ auth: { admin: { inviteUserByEmail: mockInviteUserByEmail } } }),
}))
```

E estender `makeSupabase()` para expor `chain.select` sobrescrevível (já é um objeto `chain` mutável, o teste substitui `chain.select` diretamente antes de chamar a action — nenhuma mudança necessária em `makeSupabase`, apenas confirmar que `chain` é retornado e mutável como já está).

- [ ] **Step 2: Correr o teste e confirmar falha**

Run: `npx vitest run __tests__/artists-server-actions.test.ts -t inviteArtistToApp`
Expected: FAIL com `inviteArtistToApp is not a function` ou erro de import.

- [ ] **Step 3: Implementar a action**

Adicionar a `app/dashboard/artists/actions.ts` (após `updateArtist`, antes de `updateArtistPhoto`):

```ts
import { createAdminClient } from '@/lib/supabase/admin'

export async function inviteArtistToApp(formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: 'Artista inválido' }

  const { data: artist, error: fetchError } = await auth.supabase
    .from('artists')
    .select('id, email, auth_user_id')
    .eq('id', id.data)
    .single()
  if (fetchError || !artist) return { error: 'Artista inválido' }
  if (!artist.email) return { error: 'Artista sem email definido' }
  if (artist.auth_user_id) return { error: 'Artista já convidado' }

  const admin = createAdminClient()
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(artist.email)
  if (inviteError || !invited?.user) return { error: 'Erro ao enviar convite' }

  const { error: updateError } = await auth.supabase
    .from('artists')
    .update({ auth_user_id: invited.user.id })
    .eq('id', id.data)
  if (updateError) return { error: 'Convite enviado mas falhou ao ligar a conta' }

  revalidatePath(`/dashboard/artists/${id.data}`)
  return {}
}
```

- [ ] **Step 4: Correr o teste e confirmar sucesso**

Run: `npx vitest run __tests__/artists-server-actions.test.ts`
Expected: PASS (todos os testes do ficheiro, incluindo os pré-existentes)

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/artists/actions.ts __tests__/artists-server-actions.test.ts
git commit -m "feat(dashboard): server action para convidar artista para a app"
```

---

### Task 3: Botão "Convidar para app" na ficha do artista

**Files:**
- Modify: `app/dashboard/artists/[artistId]/portal-link-card.tsx`
- Read (context only): `app/dashboard/artists/[artistId]/page.tsx`

- [ ] **Step 1: Adicionar o botão e o handler ao `PortalLinkCard`**

Adicionar import e lógica em `portal-link-card.tsx`. Primeiro o import (junto aos outros de `../actions`):

```ts
import {
  regeneratePortalToken,
  revokePortalToken,
  reactivatePortalToken,
  toggleArtistActive,
  inviteArtistToApp,
  type ActionResult,
} from '../actions'
```

Depois, dentro do bloco `<div className="flex flex-wrap gap-2">` já existente, adicionar como último botão (antes do fecho da div):

```tsx
<Button
  type="button"
  variant="outline"
  size="sm"
  disabled={isPending || Boolean(artist.auth_user_id) || !artist.email}
  onClick={() => run(inviteArtistToApp, 'Convite enviado')}
>
  {artist.auth_user_id ? 'Já convidado' : 'Convidar para app'}
</Button>
```

- [ ] **Step 2: Verificar manualmente**

Run: `npm run dev`, abrir `/dashboard/artists/<id-de-um-artista-com-email>`. Confirma:
- Botão aparece como "Convidar para app", ativo.
- Clicar dispara toast "Convite enviado" (ou erro apropriado se `SUPABASE_SERVICE_ROLE_KEY`/SMTP não configurados localmente — nesse caso confirma que o erro é tratado, não uma exceção não apanhada).
- Botão muda para "Já convidado" e fica desativado após sucesso (após reload da página, já que `revalidatePath` recarrega os dados do servidor).

- [ ] **Step 3: Typecheck e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros novos.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/artists/[artistId]/portal-link-card.tsx
git commit -m "feat(dashboard): botao convidar artista para a app mobile"
```

---

### Task 4: Scaffold do projeto Expo

**Files:**
- Create: `mobile/` (projeto Expo completo via CLI)

- [ ] **Step 1: Criar o projeto**

Run (a partir da raiz do repo):

```bash
npx create-expo-app@latest mobile --template blank-typescript
```

Expected: pasta `mobile/` criada com `package.json`, `app.json`, `tsconfig.json`, `App.tsx` inicial.

- [ ] **Step 2: Instalar dependências de navegação e Supabase**

```bash
cd mobile
npx expo install expo-router expo-linking expo-constants expo-status-bar react-native-safe-area-context react-native-screens
npm install @supabase/supabase-js @react-native-async-storage/async-storage
npx expo install expo-font @expo-google-fonts/playfair-display
cd ..
```

- [ ] **Step 3: Configurar Expo Router como entry point**

Editar `mobile/package.json`, campo `main`:

```json
"main": "expo-router/entry"
```

Editar `mobile/app.json`, adicionar dentro de `expo`:

```json
"scheme": "quicapp",
"plugins": ["expo-router"]
```

Remover `mobile/App.tsx` (Expo Router substitui o entry point manual):

```bash
rm mobile/App.tsx
```

- [ ] **Step 4: Instalar dependências de teste**

```bash
cd mobile
npx expo install jest-expo
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native @types/jest
cd ..
```

Adicionar a `mobile/package.json`:

```json
"scripts": {
  "start": "expo start",
  "test": "jest",
  "typecheck": "tsc --noEmit"
},
"jest": {
  "preset": "jest-expo"
}
```

- [ ] **Step 5: Verificar que o projeto arranca**

Run: `cd mobile && npx expo start --no-dev --non-interactive & sleep 8; kill %1 2>/dev/null; cd ..`
Expected: sem erros de bundling nos primeiros segundos de log (Metro consegue resolver todos os módulos). Se preferires verificação interativa: `cd mobile && npx expo start`, confirmar QR code aparece sem erro de build.

- [ ] **Step 6: Commit**

```bash
git add mobile/
git commit -m "chore(mobile): scaffold projeto Expo com router e supabase"
```

---

### Task 5: Cliente Supabase mobile

**Files:**
- Create: `mobile/lib/supabase.ts`
- Create: `mobile/lib/supabase.test.ts`
- Create: `mobile/.env.example`

- [ ] **Step 1: Escrever o teste que falha primeiro**

```ts
// mobile/lib/supabase.test.ts
import { describe, it, expect, jest } from '@jest/globals'

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn((url: string, key: string, opts: unknown) => ({ url, key, opts })),
}))

describe('supabase client', () => {
  it('creates client with env vars and AsyncStorage persistence', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'

    jest.isolateModules(() => {
      const { createClient } = require('@supabase/supabase-js')
      const { supabase } = require('./supabase')
      expect(createClient).toHaveBeenCalledWith(
        'https://example.supabase.co',
        'anon-key',
        expect.objectContaining({
          auth: expect.objectContaining({
            persistSession: true,
            autoRefreshToken: true,
          }),
        })
      )
      expect(supabase).toBeDefined()
    })
  })
})
```

- [ ] **Step 2: Correr e confirmar falha**

Run: `cd mobile && npx jest lib/supabase.test.ts`
Expected: FAIL, `Cannot find module './supabase'`

- [ ] **Step 3: Implementar**

```ts
// mobile/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

```bash
# mobile/.env.example
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 4: Correr e confirmar sucesso**

Run: `cd mobile && npx jest lib/supabase.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/supabase.ts mobile/lib/supabase.test.ts mobile/.env.example
git commit -m "feat(mobile): cliente supabase com persistencia de sessao"
```

---

### Task 6: Resolução de papel (client vs artist)

**Files:**
- Create: `mobile/lib/role.ts`
- Create: `mobile/lib/role.test.ts`

- [ ] **Step 1: Escrever o teste que falha primeiro**

```ts
// mobile/lib/role.test.ts
import { describe, it, expect, jest } from '@jest/globals'
import { resolveUserRole } from './role'

describe('resolveUserRole', () => {
  it('returns client role when no session', async () => {
    const supabase = { from: jest.fn() } as never
    const result = await resolveUserRole(supabase, null)
    expect(result).toEqual({ role: 'guest' })
  })

  it('returns artist role when artists row found', async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: 'artist-1', name: 'Maria', photo_url: null, bio: null },
      error: null,
    })
    const eq = jest.fn(() => ({ single }))
    const select = jest.fn(() => ({ eq }))
    const supabase = { from: jest.fn(() => ({ select })) } as never

    const session = { user: { id: 'auth-user-1' } } as never
    const result = await resolveUserRole(supabase, session)

    expect(supabase.from).toHaveBeenCalledWith('artists')
    expect(select).toHaveBeenCalledWith('id, name, photo_url, bio')
    expect(eq).toHaveBeenCalledWith('auth_user_id', 'auth-user-1')
    expect(result).toEqual({
      role: 'artist',
      artist: { id: 'artist-1', name: 'Maria', photo_url: null, bio: null },
    })
  })

  it('returns client role when no artists row found', async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: null })
    const eq = jest.fn(() => ({ single }))
    const select = jest.fn(() => ({ eq }))
    const supabase = { from: jest.fn(() => ({ select })) } as never

    const session = { user: { id: 'auth-user-2' } } as never
    const result = await resolveUserRole(supabase, session)

    expect(result).toEqual({ role: 'client' })
  })
})
```

- [ ] **Step 2: Correr e confirmar falha**

Run: `cd mobile && npx jest lib/role.test.ts`
Expected: FAIL, `Cannot find module './role'`

- [ ] **Step 3: Implementar**

```ts
// mobile/lib/role.ts
import type { SupabaseClient, Session } from '@supabase/supabase-js'

export type UserRole =
  | { role: 'guest' }
  | { role: 'client' }
  | { role: 'artist'; artist: { id: string; name: string; photo_url: string | null; bio: string | null } }

export async function resolveUserRole(
  supabase: SupabaseClient,
  session: Session | null
): Promise<UserRole> {
  if (!session) return { role: 'guest' }

  const { data } = await supabase
    .from('artists')
    .select('id, name, photo_url, bio')
    .eq('auth_user_id', session.user.id)
    .single()

  if (!data) return { role: 'client' }

  return { role: 'artist', artist: data }
}
```

- [ ] **Step 4: Correr e confirmar sucesso**

Run: `cd mobile && npx jest lib/role.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/role.ts mobile/lib/role.test.ts
git commit -m "feat(mobile): resolucao de papel client vs artist"
```

---

### Task 7: Ecrã de login

**Files:**
- Create: `mobile/app/login.tsx`
- Create: `mobile/app/login.test.tsx`
- Create: `mobile/components/AuthTextInput.tsx`

- [ ] **Step 1: Componente de input reutilizável (usado em login e signup)**

```tsx
// mobile/components/AuthTextInput.tsx
import { TextInput, TextInputProps, StyleSheet } from 'react-native'

export function AuthTextInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="#78716c"
      style={styles.input}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
    />
  )
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.05)',
    fontSize: 14,
  },
})
```

- [ ] **Step 2: Escrever o teste do ecrã de login que falha primeiro**

```tsx
// mobile/app/login.test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import LoginScreen from './login'

const mockSignInWithPassword = jest.fn()
const mockReplace = jest.fn()

jest.mock('../lib/supabase', () => ({
  supabase: { auth: { signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args) } },
}))
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}))

beforeEach(() => {
  mockSignInWithPassword.mockReset()
  mockReplace.mockReset()
})

describe('LoginScreen', () => {
  it('shows error on invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    const { getByPlaceholderText, getByText } = render(<LoginScreen />)

    fireEvent.changeText(getByPlaceholderText('Email'), 'maria@example.com')
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrong-pass')
    fireEvent.press(getByText('Entrar'))

    await waitFor(() => {
      expect(getByText('Credenciais inválidas')).toBeTruthy()
    })
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('redirects to tabs on success', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null })
    const { getByPlaceholderText, getByText } = render(<LoginScreen />)

    fireEvent.changeText(getByPlaceholderText('Email'), 'maria@example.com')
    fireEvent.changeText(getByPlaceholderText('Password'), 'correct-pass')
    fireEvent.press(getByText('Entrar'))

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)')
    })
  })
})
```

- [ ] **Step 3: Correr e confirmar falha**

Run: `cd mobile && npx jest app/login.test.tsx`
Expected: FAIL, `Cannot find module './login'`

- [ ] **Step 4: Implementar o ecrã**

```tsx
// mobile/app/login.tsx
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

- [ ] **Step 5: Correr e confirmar sucesso**

Run: `cd mobile && npx jest app/login.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add mobile/app/login.tsx mobile/app/login.test.tsx mobile/components/AuthTextInput.tsx
git commit -m "feat(mobile): ecra de login"
```

---

### Task 8: Ecrã de signup

**Files:**
- Create: `mobile/app/signup.tsx`
- Create: `mobile/app/signup.test.tsx`

- [ ] **Step 1: Escrever o teste que falha primeiro**

```tsx
// mobile/app/signup.test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import SignupScreen from './signup'

const mockSignUp = jest.fn()
const mockReplace = jest.fn()

jest.mock('../lib/supabase', () => ({
  supabase: { auth: { signUp: (...args: unknown[]) => mockSignUp(...args) } },
}))
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}))

beforeEach(() => {
  mockSignUp.mockReset()
  mockReplace.mockReset()
})

describe('SignupScreen', () => {
  it('shows error when email already registered', async () => {
    mockSignUp.mockResolvedValue({ error: { message: 'User already registered' } })
    const { getByPlaceholderText, getByText } = render(<SignupScreen />)

    fireEvent.changeText(getByPlaceholderText('Email'), 'ja@example.com')
    fireEvent.changeText(getByPlaceholderText('Password'), 'somepass123')
    fireEvent.press(getByText('Criar conta'))

    await waitFor(() => {
      expect(getByText('Este email já está registado')).toBeTruthy()
    })
  })

  it('redirects to tabs on success', async () => {
    mockSignUp.mockResolvedValue({ error: null })
    const { getByPlaceholderText, getByText } = render(<SignupScreen />)

    fireEvent.changeText(getByPlaceholderText('Email'), 'nova@example.com')
    fireEvent.changeText(getByPlaceholderText('Password'), 'somepass123')
    fireEvent.press(getByText('Criar conta'))

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)')
    })
  })
})
```

- [ ] **Step 2: Correr e confirmar falha**

Run: `cd mobile && npx jest app/signup.test.tsx`
Expected: FAIL, `Cannot find module './signup'`

- [ ] **Step 3: Implementar o ecrã**

```tsx
// mobile/app/signup.tsx
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
```

- [ ] **Step 4: Correr e confirmar sucesso**

Run: `cd mobile && npx jest app/signup.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/app/signup.tsx mobile/app/signup.test.tsx
git commit -m "feat(mobile): ecra de signup"
```

---

### Task 9: Root layout com redirect por sessão

**Files:**
- Create: `mobile/app/_layout.tsx`
- Create: `mobile/app/_layout.test.tsx`
- Create: `mobile/hooks/useSession.ts`
- Create: `mobile/hooks/useSession.test.ts`

- [ ] **Step 1: Escrever o teste do hook `useSession` que falha primeiro**

```ts
// mobile/hooks/useSession.test.ts
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { renderHook, waitFor } from '@testing-library/react-native'
import { useSession } from './useSession'

const mockGetSession = jest.fn()
const mockOnAuthStateChange = jest.fn()

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  },
}))

beforeEach(() => {
  mockGetSession.mockReset()
  mockOnAuthStateChange.mockReset()
  mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } })
})

describe('useSession', () => {
  it('starts loading then resolves session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    const { result } = renderHook(() => useSession())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.session).toEqual({ user: { id: 'u1' } })
  })

  it('resolves null session when logged out', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    const { result } = renderHook(() => useSession())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.session).toBeNull()
  })
})
```

- [ ] **Step 2: Correr e confirmar falha**

Run: `cd mobile && npx jest hooks/useSession.test.ts`
Expected: FAIL, `Cannot find module './useSession'`

- [ ] **Step 3: Implementar o hook**

```ts
// mobile/hooks/useSession.ts
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return { session, loading }
}
```

- [ ] **Step 4: Correr e confirmar sucesso do hook**

Run: `cd mobile && npx jest hooks/useSession.test.ts`
Expected: PASS

- [ ] **Step 5: Escrever o teste do root layout que falha primeiro**

```tsx
// mobile/app/_layout.test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, waitFor } from '@testing-library/react-native'
import RootLayout from './_layout'

const mockUseSession = jest.fn()
const mockReplace = jest.fn()

jest.mock('../hooks/useSession', () => ({ useSession: () => mockUseSession() }))
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  Slot: () => null,
}))

beforeEach(() => {
  mockUseSession.mockReset()
  mockReplace.mockReset()
})

describe('RootLayout', () => {
  it('redirects to login when no session', async () => {
    mockUseSession.mockReturnValue({ session: null, loading: false })
    render(<RootLayout />)

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login')
    })
  })

  it('does not redirect while loading', () => {
    mockUseSession.mockReturnValue({ session: null, loading: true })
    render(<RootLayout />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('does not redirect when session present', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    render(<RootLayout />)
    await new Promise((r) => setTimeout(r, 0))
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 6: Correr e confirmar falha**

Run: `cd mobile && npx jest app/_layout.test.tsx`
Expected: FAIL, `Cannot find module './_layout'`

- [ ] **Step 7: Implementar o root layout**

```tsx
// mobile/app/_layout.tsx
import { useEffect } from 'react'
import { Slot, useRouter } from 'expo-router'
import { useSession } from '../hooks/useSession'

export default function RootLayout() {
  const { session, loading } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login')
    }
  }, [loading, session, router])

  return <Slot />
}
```

- [ ] **Step 8: Correr e confirmar sucesso**

Run: `cd mobile && npx jest app/_layout.test.tsx`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add mobile/app/_layout.tsx mobile/app/_layout.test.tsx mobile/hooks/useSession.ts mobile/hooks/useSession.test.ts
git commit -m "feat(mobile): root layout com redirect por sessao"
```

---

### Task 10: Tab bar com 4 abas

**Files:**
- Create: `mobile/app/(tabs)/_layout.tsx`
- Create: `mobile/app/(tabs)/index.tsx`
- Create: `mobile/app/(tabs)/catalogo.tsx`
- Create: `mobile/app/(tabs)/mais.tsx`
- Create: `mobile/components/PlaceholderScreen.tsx`
- Create: `mobile/components/PlaceholderScreen.test.tsx`

- [ ] **Step 1: Escrever o teste do componente placeholder que falha primeiro**

```tsx
// mobile/components/PlaceholderScreen.test.tsx
import { describe, it, expect } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { PlaceholderScreen } from './PlaceholderScreen'

describe('PlaceholderScreen', () => {
  it('renders title and message', () => {
    const { getByText } = render(<PlaceholderScreen title="Início" message="Em breve" />)
    expect(getByText('Início')).toBeTruthy()
    expect(getByText('Em breve')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Correr e confirmar falha**

Run: `cd mobile && npx jest components/PlaceholderScreen.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implementar o componente placeholder**

```tsx
// mobile/components/PlaceholderScreen.tsx
import { View, Text, StyleSheet } from 'react-native'

export function PlaceholderScreen({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{title.toUpperCase()}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', gap: 8 },
  label: { fontSize: 11, letterSpacing: 3, color: '#a8a29e', fontWeight: '600' },
  message: { fontSize: 14, color: '#57534e' },
})
```

- [ ] **Step 4: Correr e confirmar sucesso**

Run: `cd mobile && npx jest components/PlaceholderScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Criar os ecrãs placeholder das 3 tabs simples**

```tsx
// mobile/app/(tabs)/index.tsx
import { PlaceholderScreen } from '../../components/PlaceholderScreen'
export default function InicioScreen() {
  return <PlaceholderScreen title="Início" message="Em breve: eventos Quic" />
}
```

```tsx
// mobile/app/(tabs)/catalogo.tsx
import { PlaceholderScreen } from '../../components/PlaceholderScreen'
export default function CatalogoScreen() {
  return <PlaceholderScreen title="Catálogo" message="Em breve: catálogo de produtos" />
}
```

```tsx
// mobile/app/(tabs)/mais.tsx
import { PlaceholderScreen } from '../../components/PlaceholderScreen'
export default function MaisScreen() {
  return <PlaceholderScreen title="Mais" message="Sobre, contacto e definições" />
}
```

- [ ] **Step 6: Criar o layout das tabs**

```tsx
// mobile/app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#111111',
        tabBarInactiveTintColor: '#a8a29e',
        tabBarLabelStyle: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="catalogo" options={{ title: 'Catálogo' }} />
      <Tabs.Screen name="portal" options={{ title: 'Portal' }} />
      <Tabs.Screen name="mais" options={{ title: 'Mais' }} />
    </Tabs>
  )
}
```

- [ ] **Step 7: Correr toda a suite mobile e confirmar sucesso**

Run: `cd mobile && npx jest`
Expected: PASS em todos os ficheiros de teste até agora.

- [ ] **Step 8: Commit**

```bash
git add mobile/app/(tabs) mobile/components/PlaceholderScreen.tsx mobile/components/PlaceholderScreen.test.tsx
git commit -m "feat(mobile): tab bar com 4 abas e placeholders"
```

---

### Task 11: Tab Portal (role-aware)

**Files:**
- Create: `mobile/app/(tabs)/portal.tsx`
- Create: `mobile/app/(tabs)/portal.test.tsx`

- [ ] **Step 1: Escrever o teste que falha primeiro**

```tsx
// mobile/app/(tabs)/portal.test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, waitFor } from '@testing-library/react-native'
import PortalScreen from './portal'

const mockUseSession = jest.fn()
const mockResolveUserRole = jest.fn()

jest.mock('../../hooks/useSession', () => ({ useSession: () => mockUseSession() }))
jest.mock('../../lib/role', () => ({ resolveUserRole: (...args: unknown[]) => mockResolveUserRole(...args) }))
jest.mock('../../lib/supabase', () => ({ supabase: {} }))

beforeEach(() => {
  mockUseSession.mockReset()
  mockResolveUserRole.mockReset()
})

describe('PortalScreen', () => {
  it('shows restricted message for client role', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client' })

    const { getByText } = render(<PortalScreen />)

    await waitFor(() => {
      expect(getByText('Portal reservado a artistas agenciados')).toBeTruthy()
    })
  })

  it('shows artist name for artist role', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({
      role: 'artist',
      artist: { id: 'a1', name: 'Maria Silva', photo_url: null, bio: null },
    })

    const { getByText } = render(<PortalScreen />)

    await waitFor(() => {
      expect(getByText('Maria Silva')).toBeTruthy()
    })
  })
})
```

- [ ] **Step 2: Correr e confirmar falha**

Run: `cd mobile && npx jest app/\(tabs\)/portal.test.tsx`
Expected: FAIL, `Cannot find module './portal'`

- [ ] **Step 3: Implementar o ecrã**

```tsx
// mobile/app/(tabs)/portal.tsx
import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { useSession } from '../../hooks/useSession'
import { resolveUserRole, type UserRole } from '../../lib/role'
import { supabase } from '../../lib/supabase'

export default function PortalScreen() {
  const { session } = useSession()
  const [role, setRole] = useState<UserRole | null>(null)

  useEffect(() => {
    resolveUserRole(supabase, session).then(setRole)
  }, [session])

  if (!role) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#111111" />
      </View>
    )
  }

  if (role.role === 'artist') {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>PORTAL DO ARTISTA</Text>
        <Text style={styles.name}>{role.artist.name}</Text>
      </View>
    )
  }

  return (
    <View style={styles.center}>
      <Text style={styles.restricted}>Portal reservado a artistas agenciados</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111', justifyContent: 'center', paddingHorizontal: 24 },
  center: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 3, marginBottom: 12 },
  name: { color: '#ffffff', fontSize: 40, fontWeight: 'bold' },
  restricted: { color: '#57534e', fontSize: 14, textAlign: 'center' },
})
```

- [ ] **Step 4: Correr e confirmar sucesso**

Run: `cd mobile && npx jest app/\(tabs\)/portal.test.tsx`
Expected: PASS

- [ ] **Step 5: Correr toda a suite mobile**

Run: `cd mobile && npx jest`
Expected: PASS em tudo

- [ ] **Step 6: Commit**

```bash
git add "mobile/app/(tabs)/portal.tsx" "mobile/app/(tabs)/portal.test.tsx"
git commit -m "feat(mobile): tab portal com distincao client vs artist"
```

---

### Task 12: Verificação manual completa

**Files:** nenhum (checkpoint manual)

- [ ] **Step 1: Configurar ambiente**

Criar `mobile/.env` (não commitado, copiar de `.env.example`) com as credenciais reais do projeto Supabase (mesmas do `.env` do quic-plat: `NEXT_PUBLIC_SUPABASE_URL` → `EXPO_PUBLIC_SUPABASE_URL`, chave anon equivalente).

- [ ] **Step 2: Arrancar a app**

Run: `cd mobile && npx expo start`
Abrir no Expo Go (dispositivo físico) ou simulador iOS/Android.

- [ ] **Step 3: Testar fluxo cliente**

- Abrir app sem sessão → redireciona para `/login`.
- Ir a "Criar conta", signup com email novo → redireciona para as tabs.
- Tab Portal → mostra "Portal reservado a artistas agenciados".
- Tabs Início/Catálogo/Mais → mostram placeholders.

- [ ] **Step 4: Testar fluxo artista**

- No dashboard web (`npm run dev` na raiz), abrir a ficha de um artista com email válido.
- Clicar "Convidar para app". Confirmar toast de sucesso e botão muda para "Já convidado".
- Verificar no Supabase Auth dashboard que o utilizador foi criado e recebeu o email de convite (ou usar o link de convite gerado, se SMTP não estiver configurado localmente, copiando o link da resposta da API/logs).
- Definir password via link de convite, fazer login na app mobile com esse email+password.
- Tab Portal → mostra nome do artista em serif grande sobre fundo preto.

- [ ] **Step 5: Confirmar RLS**

No SQL Editor, autenticado como o utilizador artista (via `set local role authenticated; set local "request.jwt.claims" = '{"sub": "<auth_user_id>"}';` ou equivalente do Supabase), confirmar que `select * from artists` devolve apenas a própria row.

---

## Fora de escopo (relembrando do spec)

Conteúdo real de Início/Catálogo/Portal, policies `artist_read_own_*` nas tabelas de agenda/clippings/assets, recuperação de password avançada, contas de organizador/admin na app — todos ficam para fases seguintes.
