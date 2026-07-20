# App mobile Quic: portal do artista com dados reais (fase 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o placeholder da tab "Portal" (que hoje só mostra o nome do artista) por dados reais: agenda, imprensa, conteúdos e documentos, com RLS nova a permitir que o artista autenticado leia os próprios dados.

**Architecture:** Migration SQL adiciona 3 policies aditivas de self-read. `mobile/lib/artistPortal.ts` porta a lógica pura de `lib/artists/portal-helpers.ts` e adiciona o fetch agregado. A tab Portal ganha tabs internas condicionais (Agenda/Imprensa/Conteúdos/Documentos) e usa `Linking.openURL` para abrir ficheiros/links externos.

**Tech Stack:** Expo Router + `@supabase/supabase-js` + `expo-linking` (mobile), Jest + `@testing-library/react-native`.

---

## Nota sobre localização de testes (regra crítica deste projeto, repetida 3 vezes já)

Ficheiros `.test.tsx` que testam ecrãs sob `mobile/app/` NUNCA vivem dentro de `mobile/app/` — Expo Router trata todo ficheiro sob `app/` como rota potencial, e um teste com `@testing-library/react-native` quebra `npx expo export --platform ios`. O teste da tab Portal (Task 3) vai em `mobile/__tests__/app/(tabs)/portal.test.tsx` — este ficheiro JÁ EXISTE (da fase 1, testando o placeholder); a Task 3 SUBSTITUI o seu conteúdo para testar os dados reais, não cria um ficheiro novo.

---

### Task 1: Migration RLS self-read para dados do artista

**Files:**
- Create: `supabase/migrations/0043_artist_portal_self_read.sql`

- [ ] **Step 1: Escrever a migration**

```sql
-- Quic Platform: leitura propria do artista nos dados do portal (0043_artist_portal_self_read)
-- Segue o padrao de 0040/0041/0042: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).
-- Policies aditivas: nao tocam nas policies de equipa ja existentes (organization_id).

CREATE POLICY "artist_read_own_agenda" ON artist_agenda_items
  FOR SELECT USING (artist_id IN (SELECT id FROM artists WHERE auth_user_id = auth.uid()));

CREATE POLICY "artist_read_own_clippings" ON artist_clippings
  FOR SELECT USING (artist_id IN (SELECT id FROM artists WHERE auth_user_id = auth.uid()));

CREATE POLICY "artist_read_own_assets" ON artist_assets
  FOR SELECT USING (artist_id IN (SELECT id FROM artists WHERE auth_user_id = auth.uid()));
```

- [ ] **Step 2: Aplicar manualmente no SQL Editor do projeto Supabase (ambiente de dev/staging)**

Corre o conteúdo do ficheiro. Confirma:

```sql
select policyname from pg_policies where tablename in ('artist_agenda_items', 'artist_clippings', 'artist_assets') and policyname like 'artist_read_own%';
-- deve devolver 3 linhas
```

- [ ] **Step 3: Confirmar que as policies de equipa continuam intactas**

```sql
select tablename, policyname from pg_policies where tablename in ('artist_agenda_items', 'artist_clippings', 'artist_assets') order by tablename, policyname;
-- deve devolver 15 linhas no total (4 policies de equipa "members_*" por tabela x 3 tabelas = 12,
-- mais a nova policy "artist_read_own_*" por tabela = 3; total 5 policies por tabela).
-- Confirma visualmente que nenhuma das policies "members_*" desapareceu.
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0043_artist_portal_self_read.sql
git commit -m "feat(db): policies de leitura propria do artista no portal"
```

---

### Task 2: `mobile/lib/artistPortal.ts` (lógica portada + fetch agregado)

**Files:**
- Create: `mobile/lib/artistPortal.ts`
- Create: `mobile/lib/artistPortal.test.ts`

- [ ] **Step 1: Escrever o teste que falha primeiro**

```ts
// mobile/lib/artistPortal.test.ts
import { describe, it, expect, jest } from '@jest/globals'
import { splitAgenda, splitAssets, fetchArtistPortalData } from './artistPortal'

describe('splitAgenda', () => {
  it('separates upcoming (asc) and past (desc)', () => {
    const now = new Date('2026-06-01T00:00:00Z')
    const items = [
      { id: 'a', starts_at: '2026-06-10T00:00:00Z' },
      { id: 'b', starts_at: '2026-05-01T00:00:00Z' },
      { id: 'c', starts_at: '2026-06-05T00:00:00Z' },
      { id: 'd', starts_at: '2026-04-01T00:00:00Z' },
    ]
    const { upcoming, past } = splitAgenda(items, now)
    expect(upcoming.map(i => i.id)).toEqual(['c', 'a'])
    expect(past.map(i => i.id)).toEqual(['b', 'd'])
  })
})

describe('splitAssets', () => {
  it('separates contents and documents by section', () => {
    const assets = [
      { id: '1', section: 'content' },
      { id: '2', section: 'document' },
      { id: '3', section: 'content' },
    ]
    const { contents, documents } = splitAssets(assets)
    expect(contents.map(a => a.id)).toEqual(['1', '3'])
    expect(documents.map(a => a.id)).toEqual(['2'])
  })
})

describe('fetchArtistPortalData', () => {
  function makeQuery(resolved: { data: unknown; error: unknown }) {
    const order = jest.fn().mockResolvedValue(resolved)
    const eq2 = jest.fn(() => ({ order }))
    const eq1 = jest.fn(() => ({ eq: eq2, order }))
    const select = jest.fn(() => ({ eq: eq1 }))
    return { select, eq1, eq2, order }
  }

  it('fetches agenda, clippings and assets in parallel and splits them', async () => {
    const agenda = makeQuery({
      data: [{ id: 'a1', starts_at: '2026-06-10T00:00:00Z', is_visible: true }],
      error: null,
    })
    const clippings = makeQuery({ data: [{ id: 'c1', published_at: '2026-01-01' }], error: null })
    const assets = makeQuery({ data: [{ id: 'as1', section: 'content' }], error: null })

    const from = jest.fn((table: string) => {
      if (table === 'artist_agenda_items') return agenda
      if (table === 'artist_clippings') return clippings
      if (table === 'artist_assets') return assets
      throw new Error(`unexpected table ${table}`)
    })
    const supabase = { from } as never

    const result = await fetchArtistPortalData(supabase, 'artist-1')

    expect(from).toHaveBeenCalledWith('artist_agenda_items')
    expect(from).toHaveBeenCalledWith('artist_clippings')
    expect(from).toHaveBeenCalledWith('artist_assets')
    expect(result.upcoming).toHaveLength(1)
    expect(result.clippings).toHaveLength(1)
    expect(result.contents).toHaveLength(1)
    expect(result.documents).toHaveLength(0)
  })

  it('returns empty arrays on error', async () => {
    const empty = makeQuery({ data: null, error: { message: 'boom' } })
    const from = jest.fn(() => empty)
    const supabase = { from } as never

    const result = await fetchArtistPortalData(supabase, 'artist-1')
    expect(result).toEqual({ upcoming: [], past: [], clippings: [], contents: [], documents: [] })
  })
})
```

- [ ] **Step 2: Correr e confirmar falha**

Run: `cd mobile && npx jest lib/artistPortal.test.ts`
Expected: FAIL, `Cannot find module './artistPortal'`

- [ ] **Step 3: Implementar**

```ts
// mobile/lib/artistPortal.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ArtistAgendaItem {
  id: string
  type: string
  title: string
  starts_at: string
  ends_at: string | null
  location: string | null
  notes: string | null
}

export interface ArtistClipping {
  id: string
  title: string
  source: string | null
  url: string
  published_at: string | null
}

export interface ArtistAsset {
  id: string
  section: string
  kind: string
  title: string
  blob_url: string | null
  external_url: string | null
  thumbnail_url: string | null
  created_at: string
}

export function splitAgenda<T extends { starts_at: string }>(
  items: T[],
  now: Date = new Date()
): { upcoming: T[]; past: T[] } {
  const upcoming: T[] = []
  const past: T[] = []
  for (const item of items) {
    if (new Date(item.starts_at) >= now) upcoming.push(item)
    else past.push(item)
  }
  upcoming.sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
  past.sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at))
  return { upcoming, past }
}

export function splitAssets<T extends { section: string }>(
  assets: T[]
): { contents: T[]; documents: T[] } {
  return {
    contents: assets.filter(a => a.section === 'content'),
    documents: assets.filter(a => a.section === 'document'),
  }
}

export interface ArtistPortalData {
  upcoming: ArtistAgendaItem[]
  past: ArtistAgendaItem[]
  clippings: ArtistClipping[]
  contents: ArtistAsset[]
  documents: ArtistAsset[]
}

export async function fetchArtistPortalData(
  supabase: SupabaseClient,
  artistId: string
): Promise<ArtistPortalData> {
  const [agendaRes, clippingsRes, assetsRes] = await Promise.all([
    supabase.from('artist_agenda_items').select('*').eq('artist_id', artistId).eq('is_visible', true),
    supabase
      .from('artist_clippings')
      .select('*')
      .eq('artist_id', artistId)
      .order('published_at', { ascending: false, nullsFirst: false }),
    supabase.from('artist_assets').select('*').eq('artist_id', artistId).order('created_at', { ascending: false }),
  ])

  const { upcoming, past } = splitAgenda((agendaRes.data ?? []) as ArtistAgendaItem[])
  const { contents, documents } = splitAssets((assetsRes.data ?? []) as ArtistAsset[])

  return {
    upcoming,
    past,
    clippings: (clippingsRes.data ?? []) as ArtistClipping[],
    contents,
    documents,
  }
}
```

- [ ] **Step 4: Correr e confirmar sucesso**

Run: `cd mobile && npx jest lib/artistPortal.test.ts`
Expected: PASS (todos os testes)

- [ ] **Step 5: Correr toda a suite mobile**

Run: `cd mobile && npx jest`
Expected: PASS em tudo

- [ ] **Step 6: Commit**

```bash
git add mobile/lib/artistPortal.ts mobile/lib/artistPortal.test.ts
git commit -m "feat(mobile): logica e fetch de dados do portal do artista"
```

---

### Task 3: Tab Portal com dados reais

**Files:**
- Modify: `mobile/app/(tabs)/portal.tsx`
- Modify: `mobile/__tests__/app/(tabs)/portal.test.tsx` (já existe da fase 1, será substituído)

- [ ] **Step 1: Ler o teste atual antes de o substituir**

Ler `mobile/__tests__/app/(tabs)/portal.test.tsx` para confirmar a estrutura de mocks já usada (`useSession`, `resolveUserRole`, `supabase`) antes de a estender — os dois testes existentes ("shows restricted message for client role" e "shows artist name for artist role") devem continuar a passar ou ser adaptados de forma equivalente, não removidos sem substituto.

- [ ] **Step 2: Escrever o teste que falha primeiro (substituindo o conteúdo do ficheiro)**

```tsx
// mobile/__tests__/app/(tabs)/portal.test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, waitFor } from '@testing-library/react-native'
import PortalScreen from '../../../app/(tabs)/portal'

const mockUseSession = jest.fn()
const mockResolveUserRole = jest.fn()
const mockFetchArtistPortalData = jest.fn()

jest.mock('../../../hooks/useSession', () => ({ useSession: () => mockUseSession() }))
jest.mock('../../../lib/role', () => ({ resolveUserRole: (...args: unknown[]) => mockResolveUserRole(...args) }))
jest.mock('../../../lib/artistPortal', () => ({
  fetchArtistPortalData: (...args: unknown[]) => mockFetchArtistPortalData(...args),
}))
jest.mock('../../../lib/supabase', () => ({ supabase: {} }))

beforeEach(() => {
  mockUseSession.mockReset()
  mockResolveUserRole.mockReset()
  mockFetchArtistPortalData.mockReset()
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

  it('shows artist name and agenda data for artist role', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({
      role: 'artist',
      artist: { id: 'a1', name: 'Maria Silva', photo_url: null, bio: null },
    })
    mockFetchArtistPortalData.mockResolvedValue({
      upcoming: [{ id: 'ag1', type: 'show', title: 'Concerto X', starts_at: '2026-08-01T20:00:00Z', ends_at: null, location: null, notes: null }],
      past: [],
      clippings: [],
      contents: [],
      documents: [],
    })

    const { getByText } = render(<PortalScreen />)

    await waitFor(() => {
      expect(getByText('Maria Silva')).toBeTruthy()
    })
    expect(getByText('Concerto X')).toBeTruthy()
  })

  it('hides tabs for sections with no data', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({
      role: 'artist',
      artist: { id: 'a1', name: 'Maria Silva', photo_url: null, bio: null },
    })
    mockFetchArtistPortalData.mockResolvedValue({
      upcoming: [],
      past: [],
      clippings: [],
      contents: [],
      documents: [],
    })

    const { queryByText } = render(<PortalScreen />)

    await waitFor(() => {
      expect(queryByText('Imprensa')).toBeNull()
      expect(queryByText('Conteúdos')).toBeNull()
      expect(queryByText('Documentos')).toBeNull()
    })
  })
})
```

- [ ] **Step 3: Correr e confirmar falha**

Run: `cd mobile && npx jest --runInBand "__tests__/app/(tabs)/portal.test.tsx"`
Expected: FAIL (o componente atual não chama `fetchArtistPortalData` nem renderiza "Concerto X"/tabs internas)

- [ ] **Step 4: Implementar**

```tsx
// mobile/app/(tabs)/portal.tsx
import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, FlatList, Pressable, Linking, StyleSheet } from 'react-native'
import { useSession } from '../../hooks/useSession'
import { resolveUserRole, type UserRole } from '../../lib/role'
import { supabase } from '../../lib/supabase'
import { fetchArtistPortalData, type ArtistPortalData, type ArtistAgendaItem, type ArtistClipping, type ArtistAsset } from '../../lib/artistPortal'

type TabKey = 'agenda' | 'clipping' | 'contents' | 'documents'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function AgendaTab({ upcoming, past }: { upcoming: ArtistAgendaItem[]; past: ArtistAgendaItem[] }) {
  if (upcoming.length === 0 && past.length === 0) {
    return <Text style={styles.emptyText}>Sem compromissos agendados.</Text>
  }
  return (
    <View style={styles.tabContent}>
      {upcoming.map(item => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardMeta}>{formatDateTime(item.starts_at)}</Text>
          <Text style={styles.cardTitle}>{item.title}</Text>
          {item.location && <Text style={styles.cardSubtitle}>{item.location}</Text>}
        </View>
      ))}
    </View>
  )
}

function ClippingTab({ clippings }: { clippings: ArtistClipping[] }) {
  if (clippings.length === 0) {
    return <Text style={styles.emptyText}>Sem imprensa.</Text>
  }
  return (
    <View style={styles.tabContent}>
      {clippings.map(clipping => (
        <Pressable key={clipping.id} style={styles.card} onPress={() => Linking.openURL(clipping.url)}>
          <Text style={styles.cardTitle}>{clipping.title}</Text>
          {clipping.source && <Text style={styles.cardSubtitle}>{clipping.source}</Text>}
        </Pressable>
      ))}
    </View>
  )
}

function AssetListTab({ assets, emptyMessage }: { assets: ArtistAsset[]; emptyMessage: string }) {
  if (assets.length === 0) {
    return <Text style={styles.emptyText}>{emptyMessage}</Text>
  }
  return (
    <View style={styles.tabContent}>
      {assets.map(asset => (
        <Pressable
          key={asset.id}
          style={styles.card}
          onPress={() => {
            const url = asset.external_url ?? asset.blob_url
            if (url) Linking.openURL(url)
          }}
        >
          <Text style={styles.cardTitle}>{asset.title}</Text>
          <Text style={styles.cardSubtitle}>{formatDate(asset.created_at)}</Text>
        </Pressable>
      ))}
    </View>
  )
}

function ArtistPortalContent({ artist, data }: { artist: { name: string }; data: ArtistPortalData }) {
  const [activeTab, setActiveTab] = useState<TabKey>('agenda')

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'agenda', label: 'Agenda' },
    ...(data.clippings.length > 0 ? [{ key: 'clipping' as const, label: 'Imprensa' }] : []),
    ...(data.contents.length > 0 ? [{ key: 'contents' as const, label: 'Conteúdos' }] : []),
    ...(data.documents.length > 0 ? [{ key: 'documents' as const, label: 'Documentos' }] : []),
  ]

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.label}>PORTAL DO ARTISTA</Text>
        <Text style={styles.name}>{artist.name}</Text>
      </View>

      {tabs.length > 1 && (
        <View style={styles.tabBar}>
          {tabs.map(tab => (
            <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={styles.tabButton}>
              <Text style={[styles.tabButtonText, activeTab === tab.key && styles.tabButtonTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <FlatList
        data={[activeTab]}
        keyExtractor={item => item}
        contentContainerStyle={styles.body}
        renderItem={() => {
          if (activeTab === 'agenda') return <AgendaTab upcoming={data.upcoming} past={data.past} />
          if (activeTab === 'clipping') return <ClippingTab clippings={data.clippings} />
          if (activeTab === 'contents') return <AssetListTab assets={data.contents} emptyMessage="Sem conteúdos." />
          return <AssetListTab assets={data.documents} emptyMessage="Sem documentos." />
        }}
      />
    </View>
  )
}

export default function PortalScreen() {
  const { session } = useSession()
  const [role, setRole] = useState<UserRole | null>(null)
  const [data, setData] = useState<ArtistPortalData | null>(null)

  useEffect(() => {
    resolveUserRole(supabase, session).then(setRole)
  }, [session])

  useEffect(() => {
    if (role?.role === 'artist') {
      fetchArtistPortalData(supabase, role.artist.id).then(setData)
    }
  }, [role])

  if (!role) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#111111" />
      </View>
    )
  }

  if (role.role === 'artist') {
    if (!data) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color="#111111" />
        </View>
      )
    }
    return <ArtistPortalContent artist={role.artist} data={data} />
  }

  return (
    <View style={styles.center}>
      <Text style={styles.restricted}>Portal reservado a artistas agenciados</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  hero: { backgroundColor: '#111111', paddingHorizontal: 24, paddingVertical: 32 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 3, marginBottom: 12 },
  name: { color: '#ffffff', fontSize: 32, fontWeight: 'bold' },
  restricted: { color: '#57534e', fontSize: 14, textAlign: 'center' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e7e5e4' },
  tabButton: { paddingHorizontal: 16, paddingVertical: 12 },
  tabButtonText: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#a8a29e', fontWeight: '600' },
  tabButtonTextActive: { color: '#111111' },
  body: { padding: 16 },
  tabContent: { gap: 12 },
  card: { backgroundColor: '#fafaf9', borderWidth: 1, borderColor: '#f5f5f4', borderRadius: 6, padding: 14 },
  cardMeta: { fontSize: 11, color: '#a8a29e', marginBottom: 4 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1c1917' },
  cardSubtitle: { fontSize: 12, color: '#78716c', marginTop: 2 },
  emptyText: { color: '#78716c', fontSize: 14, padding: 16 },
})
```

- [ ] **Step 5: Correr e confirmar sucesso**

Run: `cd mobile && npx jest --runInBand "__tests__/app/(tabs)/portal.test.tsx"`
Expected: PASS (todos os 3 testes)

- [ ] **Step 6: Correr toda a suite mobile**

Run: `cd mobile && npx jest --runInBand`
Expected: PASS em tudo (usar `--runInBand` porque este projeto já confirmou flakiness sob execução paralela nesta máquina; isolar workers evita falsos negativos)

- [ ] **Step 7: Verificar que o bundle continua a exportar**

Run: `cd mobile && npx expo export --platform ios`
Expected: sucesso, sem erro de `Unable to resolve module console`

Depois: `rm -rf mobile/dist`

- [ ] **Step 8: Commit**

```bash
git add "mobile/app/(tabs)/portal.tsx" "mobile/__tests__/app/(tabs)/portal.test.tsx"
git commit -m "feat(mobile): portal do artista com dados reais (agenda, imprensa, conteudos, documentos)"
```

---

### Task 4: Verificação manual completa

**Files:** nenhum (checkpoint manual)

- [ ] **Step 1: Confirmar RLS**

No SQL Editor, autenticado como o utilizador artista (via `set local role authenticated; set local "request.jwt.claims" = '{"sub": "<auth_user_id>"}';` ou equivalente), confirmar:

```sql
select count(*) from artist_agenda_items;
select count(*) from artist_clippings;
select count(*) from artist_assets;
```

Devem devolver só os registos do artista autenticado, não de outros artistas da mesma organização.

- [ ] **Step 2: Arrancar a app**

Run: `cd mobile && npx expo start`. Login como artista já convidado (fase 1).

- [ ] **Step 3: Confirmar o portal**

- Hero mostra nome do artista.
- Tabs internas só aparecem para secções com dados (ex: se o artista não tiver imprensa, a tab "Imprensa" não aparece).
- Agenda mostra próximos compromissos; tocar num item de imprensa/conteúdo/documento abre o link no browser do telemóvel.
- Se o artista não tiver nenhum dado nalguma secção, mostra a mensagem de vazio correta.

---

## Fora de escopo (relembrando do spec)

Upload ou edição de dados do artista a partir da app, notificações push, pré-visualização de PDF/imagem dentro da app.
