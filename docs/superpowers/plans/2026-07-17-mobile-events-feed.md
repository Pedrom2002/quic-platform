# App mobile Quic: feed de eventos públicos (fase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o placeholder da tab "Início" da app mobile por um feed real de eventos Quic públicos, com ecrã de detalhe, e dar ao dashboard web a capacidade de marcar um evento como público e dar-lhe uma foto de capa.

**Architecture:** Migration SQL adiciona `cover_image_url` e `is_public_listed` a `events` + policy RLS pública de leitura filtrada. Dashboard ganha upload de capa (padrão idêntico a `updateArtistPhoto`) e um checkbox de publicação no formulário de edição já existente. App mobile ganha `mobile/lib/events.ts` com duas funções de fetch, a tab Início lista os eventos, e um novo ecrã `mobile/app/evento/[id].tsx` mostra o detalhe.

**Tech Stack:** Next.js Server Actions + Supabase (dashboard web), Expo Router + `@supabase/supabase-js` (mobile), vitest com mocks (dashboard), Jest + `@testing-library/react-native` (mobile).

---

## Nota sobre testes

Segue o mesmo padrão já estabelecido nas fases anteriores: testes de Server Actions usam um Supabase client mockado (ver `__tests__/artists-server-actions.test.ts`), testes mobile usam Jest com mocks do módulo `@/lib/supabase`. A verificação da policy RLS pública é manual via SQL Editor (não há suite de integração contra BD real neste repo).

---

### Task 1: Migration `cover_image_url` + `is_public_listed` em `events`

**Files:**
- Create: `supabase/migrations/0042_events_public_listing.sql`

- [ ] **Step 1: Escrever a migration**

```sql
-- Quic Platform: eventos publicaveis no feed do app mobile (0042_events_public_listing)
-- Segue o padrao de 0040/0041: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).

ALTER TABLE events ADD COLUMN cover_image_url text;
ALTER TABLE events ADD COLUMN is_public_listed boolean NOT NULL DEFAULT false;

CREATE POLICY "public_read_listed_events" ON events
  FOR SELECT USING (is_public_listed = true);
```

- [ ] **Step 2: Aplicar manualmente no SQL Editor do projeto Supabase (ambiente de dev/staging)**

Corre o conteúdo do ficheiro no SQL Editor. Confirma sem erros:

```sql
select column_name from information_schema.columns where table_name = 'events' and column_name in ('cover_image_url', 'is_public_listed');
-- deve devolver 2 linhas
select policyname from pg_policies where tablename = 'events' and policyname = 'public_read_listed_events';
-- deve devolver 1 linha
```

- [ ] **Step 3: Regenerar tipos TypeScript**

Run: `npm run db:types`
Expected: `types/database.ts` passa a incluir `cover_image_url: string | null` e `is_public_listed: boolean` em `events.Row`.

Se não houver acesso ao projeto Supabase real neste ambiente, edita `types/database.ts` manualmente: localiza a definição de `events` em `Tables` e adiciona `cover_image_url: string | null` e `is_public_listed: boolean` a `Row`, `Insert` (`is_public_listed` opcional, tem default) e `Update` (ambos opcionais).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0042_events_public_listing.sql types/database.ts
git commit -m "feat(db): adiciona cover_image_url e is_public_listed a events"
```

---

### Task 2: Schema zod + server action de upload de capa

**Files:**
- Modify: `schemas/event.schema.ts`
- Modify: `app/dashboard/events/[eventId]/edit/actions.ts`
- Test: `__tests__/events-edit-actions.test.ts` (novo)

- [ ] **Step 1: Estender o schema**

Em `schemas/event.schema.ts`, alterar a linha do `updateEventSchema`:

```ts
export const updateEventSchema = eventBaseSchema.partial().extend({
  status: z.enum(['planning', 'active', 'completed', 'cancelled']).optional(),
  is_public_listed: z.boolean().optional(),
})
```

- [ ] **Step 2: Escrever o teste que falha primeiro**

Criar `__tests__/events-edit-actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOrgAuth, mockPut } = vi.hoisted(() => ({
  mockRequireOrgAuth: vi.fn(),
  mockPut: vi.fn(),
}))

vi.mock('@/lib/supabase/actions', () => ({ requireOrgAuth: mockRequireOrgAuth }))
vi.mock('@vercel/blob', () => ({ put: mockPut }))
vi.mock('@/lib/env', () => ({
  getEnv: () => ({ BLOB_READ_WRITE_TOKEN: 'blob-token', NEXT_PUBLIC_APP_URL: 'https://app.quic.pt' }),
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn() }))

function makeSupabase() {
  const calls: Record<string, unknown[]> = { update: [], eq: [] }
  const chain = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: UUID }, error: null }),
        })),
      })),
    })),
    update: vi.fn((payload: unknown) => {
      calls.update.push(payload)
      return {
        eq: vi.fn(() => ({
          eq: vi.fn(() => {
            calls.eq.push(payload)
            return Promise.resolve({ error: null })
          }),
        })),
      }
    }),
  }
  return { supabase: { from: vi.fn(() => chain) }, calls, chain }
}

function fd(obj: Record<string, string | File>) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(obj)) formData.set(key, value)
  return formData
}

const UUID = '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b'

function authAs(supabase: unknown) {
  mockRequireOrgAuth.mockResolvedValue({
    supabase,
    user: { id: 'user-1' },
    member: { organization_id: 'org-1', role: 'member' },
  })
}

beforeEach(() => {
  mockRequireOrgAuth.mockReset()
  mockPut.mockReset()
})

describe('updateEventCoverPhoto', () => {
  const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])

  it('rejects unauthenticated', async () => {
    mockRequireOrgAuth.mockRejectedValue(new Error('Não autenticado'))
    const { updateEventCoverPhoto } = await import('@/app/dashboard/events/[eventId]/edit/actions')
    const result = await updateEventCoverPhoto(fd({ id: UUID }))
    expect(result.error).toBe('Sem permissões')
  })

  it('rejects missing file', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { updateEventCoverPhoto } = await import('@/app/dashboard/events/[eventId]/edit/actions')
    const result = await updateEventCoverPhoto(fd({ id: UUID }))
    expect(result.error).toBe('Seleciona uma imagem')
  })

  it('rejects non-image content (magic bytes)', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { updateEventCoverPhoto } = await import('@/app/dashboard/events/[eventId]/edit/actions')
    const fake = new File([new TextEncoder().encode('<svg>nope</svg>')], 'capa.png', {
      type: 'image/png',
    })
    const result = await updateEventCoverPhoto(fd({ id: UUID, photo: fake }))
    expect(result.error).toContain('Formato de imagem não suportado')
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('uploads real png and stores blob url', async () => {
    const { supabase, calls } = makeSupabase()
    authAs(supabase)
    mockPut.mockResolvedValue({ url: 'https://blob.vercel-storage.com/capa.png' })
    const { updateEventCoverPhoto } = await import('@/app/dashboard/events/[eventId]/edit/actions')
    const photo = new File([pngBytes], 'capa.png', { type: 'image/png' })
    const result = await updateEventCoverPhoto(fd({ id: UUID, photo }))
    expect(result.error).toBeUndefined()
    expect(mockPut).toHaveBeenCalledOnce()
    const updated = calls.update[0] as Record<string, unknown>
    expect(updated.cover_image_url).toBe('https://blob.vercel-storage.com/capa.png')
  })
})
```

- [ ] **Step 3: Correr o teste e confirmar falha**

Run: `npx vitest run __tests__/events-edit-actions.test.ts`
Expected: FAIL, `updateEventCoverPhoto is not a function` ou erro de import.

- [ ] **Step 4: Implementar a action**

Adicionar a `app/dashboard/events/[eventId]/edit/actions.ts`:

```ts
import * as z from 'zod'
import { put } from '@vercel/blob'
import { detectMimeFromMagic, safeBlobPathname } from '@/schemas/file.schema'
import { getEnv } from '@/lib/env'

export type ActionResult = { error?: string }

const MAX_PHOTO_SIZE = 5 * 1024 * 1024 // 5 MB
const PHOTO_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function updateEventCoverPhoto(formData: FormData): Promise<ActionResult> {
  const auth = await (async () => {
    try {
      return await requireOrgAuth()
    } catch {
      return null
    }
  })()
  if (!auth) return { error: 'Sem permissões' }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: 'Evento inválido' }

  const photo = formData.get('photo')
  if (!(photo instanceof File) || photo.size === 0) {
    return { error: 'Seleciona uma imagem' }
  }
  if (photo.size > MAX_PHOTO_SIZE) {
    return { error: 'Imagem demasiado grande (máx. 5 MB)' }
  }

  const detected = await detectMimeFromMagic(photo)
  if (!detected || !PHOTO_MIME_TYPES.has(detected)) {
    return { error: 'Formato de imagem não suportado (usa JPG, PNG, WebP ou GIF)' }
  }

  const token = getEnv().BLOB_READ_WRITE_TOKEN
  if (!token) return { error: 'Upload de ficheiros não configurado' }

  const blob = await put(safeBlobPathname(photo.name), photo, { access: 'public', token })

  const { error } = await auth.supabase
    .from('events')
    .update({ cover_image_url: blob.url })
    .eq('id', id.data)
    .eq('organization_id', auth.member.organization_id)
  if (error) return { error: 'Erro ao guardar a foto' }

  return {}
}
```

Nota: `requireOrgAuth` já está importado no ficheiro (usado por `updateEventAction`); não duplicar o import.

- [ ] **Step 5: Correr o teste e confirmar sucesso**

Run: `npx vitest run __tests__/events-edit-actions.test.ts`
Expected: PASS

- [ ] **Step 6: Confirmar que `updateEventAction` já aceita `is_public_listed` (spread genérico, sem mudança de código)**

Run: `npx vitest run __tests__/events-edit-actions.test.ts` (nenhum teste novo necessário aqui, `updateEventAction` já faz `update({ ...data, ... })`; a extensão do schema no Step 1 é suficiente). Confirma lendo `app/dashboard/events/[eventId]/edit/actions.ts:41-47` que o spread cobre o campo novo.

- [ ] **Step 7: Commit**

```bash
git add schemas/event.schema.ts app/dashboard/events/[eventId]/edit/actions.ts __tests__/events-edit-actions.test.ts
git commit -m "feat(dashboard): action de upload de capa e schema com is_public_listed"
```

---

### Task 3: Formulário de edição de evento (upload de capa + toggle de publicação)

**Files:**
- Modify: `app/dashboard/events/[eventId]/edit/page.tsx`

- [ ] **Step 1: Adicionar estado e handler de upload de foto**

Em `EditEventPage`, adicionar após a declaração dos estados existentes (`loading`, `fetching`):

```tsx
const [coverUrl, setCoverUrl] = useState<string | null>(null)
const [uploadingPhoto, setUploadingPhoto] = useState(false)
const [isPublicListed, setIsPublicListed] = useState(false)
```

No `useEffect` que busca o evento, adicionar após `reset({...})`:

```tsx
setCoverUrl(data.cover_image_url ?? null)
setIsPublicListed(data.is_public_listed ?? false)
```

Adicionar a função de submissão da foto (usa `useTransition` como o resto do dashboard, ou uma função async simples com `startTransition` importado de `react`):

```tsx
import { useTransition } from 'react'
import { updateEventCoverPhoto } from './actions'

// dentro do componente, junto aos outros hooks:
const [isPendingPhoto, startPhotoTransition] = useTransition()

function handlePhotoSubmit(formData: FormData) {
  setUploadingPhoto(true)
  startPhotoTransition(async () => {
    const result = await updateEventCoverPhoto(formData)
    setUploadingPhoto(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Capa atualizada')
    router.refresh()
  })
}
```

- [ ] **Step 2: Adicionar o campo de foto de capa ao JSX**

Este bloco é um `<form>` próprio, independente do formulário principal (`<form onSubmit={handleSubmit(onSubmit)}>`) — um `<form>` não pode ser aninhado dentro de outro `<form>` em HTML. Inserir como uma secção IRMÃ, imediatamente ANTES da linha `<form onSubmit={handleSubmit(onSubmit)} className="space-y-5">`, ainda dentro do mesmo `<div className="bg-white border-slate-200 rounded-xl shadow-sm p-6 mt-6">`:

```tsx
<div className="mb-6 space-y-1.5">
  <Label className="text-slate-600">Foto de capa (app mobile)</Label>
  <div className="flex flex-wrap items-center gap-4">
    {coverUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={coverUrl} alt="Capa do evento" className="h-20 w-32 rounded-lg object-cover" />
    ) : (
      <div className="flex h-20 w-32 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
        Sem foto
      </div>
    )}
    <form
      action={(formData: FormData) => {
        formData.set('id', params.eventId)
        handlePhotoSubmit(formData)
      }}
      className="flex flex-1 flex-wrap items-center gap-2"
    >
      <Input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/gif" className="max-w-64 bg-white border-slate-200" />
      <Button type="submit" disabled={isPendingPhoto} variant="secondary">
        {isPendingPhoto ? 'A enviar...' : 'Guardar capa'}
      </Button>
    </form>
  </div>
</div>
```

Ou seja, a ordem final dentro do `<div className="bg-white ...">` fica: título "Detalhes do evento" → bloco de foto de capa (novo, `<form>` próprio) → `<form onSubmit={handleSubmit(onSubmit)}>` principal (com todos os campos existentes mais o checkbox do Step 3).

- [ ] **Step 3: Adicionar o toggle de publicação**

Inserir no `<form>` principal, após o campo "Descrição":

```tsx
<div className="flex items-center gap-2">
  <input
    type="checkbox"
    id="is_public_listed"
    checked={isPublicListed}
    onChange={e => {
      setIsPublicListed(e.target.checked)
      setValue('is_public_listed', e.target.checked, { shouldValidate: true })
    }}
    className="h-4 w-4 rounded border-slate-300"
  />
  <Label htmlFor="is_public_listed" className="text-slate-600 cursor-pointer">
    Publicar no app mobile
  </Label>
</div>
<p className="text-xs text-slate-400 -mt-3">
  Só eventos publicados aparecem no feed público da app.
</p>
```

- [ ] **Step 4: Verificar manualmente**

Run: `npm run dev`, abrir `/dashboard/events/<id>/edit`. Confirma:
- Campo de capa mostra "Sem foto" inicialmente, upload funciona, toast de sucesso, imagem aparece após `router.refresh()`.
- Checkbox "Publicar no app mobile" reflete o estado atual e ao gravar (submeter o formulário principal) persiste `is_public_listed`.

- [ ] **Step 5: Typecheck e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros novos.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/events/[eventId]/edit/page.tsx
git commit -m "feat(dashboard): upload de capa e toggle de publicacao no editar evento"
```

---

### Task 4: `mobile/lib/events.ts` (fetch de eventos públicos)

**Files:**
- Create: `mobile/lib/events.ts`
- Create: `mobile/lib/events.test.ts`

- [ ] **Step 1: Escrever o teste que falha primeiro**

```ts
// mobile/lib/events.test.ts
import { describe, it, expect, jest } from '@jest/globals'
import { fetchPublicEvents, fetchEventById } from './events'

describe('fetchPublicEvents', () => {
  it('queries public events ordered by start date', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: 'e1', name: 'Show X', description: null, venue_name: null, venue_address: null, start_datetime: '2026-08-01T20:00:00Z', end_datetime: '2026-08-01T23:00:00Z', cover_image_url: null }],
      error: null,
    })
    const eq = jest.fn(() => ({ order }))
    const select = jest.fn(() => ({ eq }))
    const supabase = { from: jest.fn(() => ({ select })) } as never

    const result = await fetchPublicEvents(supabase)

    expect(supabase.from).toHaveBeenCalledWith('events')
    expect(select).toHaveBeenCalledWith(
      'id, name, description, venue_name, venue_address, start_datetime, end_datetime, cover_image_url'
    )
    expect(eq).toHaveBeenCalledWith('is_public_listed', true)
    expect(order).toHaveBeenCalledWith('start_datetime', { ascending: true })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Show X')
  })

  it('returns empty array on error', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    const eq = jest.fn(() => ({ order }))
    const select = jest.fn(() => ({ eq }))
    const supabase = { from: jest.fn(() => ({ select })) } as never

    const result = await fetchPublicEvents(supabase)
    expect(result).toEqual([])
  })
})

describe('fetchEventById', () => {
  it('queries a single event by id', async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: 'e1', name: 'Show X', description: null, venue_name: null, venue_address: null, start_datetime: '2026-08-01T20:00:00Z', end_datetime: '2026-08-01T23:00:00Z', cover_image_url: null },
      error: null,
    })
    const eq = jest.fn(() => ({ single }))
    const select = jest.fn(() => ({ eq }))
    const supabase = { from: jest.fn(() => ({ select })) } as never

    const result = await fetchEventById(supabase, 'e1')

    expect(eq).toHaveBeenCalledWith('id', 'e1')
    expect(result?.name).toBe('Show X')
  })

  it('returns null when not found', async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: null })
    const eq = jest.fn(() => ({ single }))
    const select = jest.fn(() => ({ eq }))
    const supabase = { from: jest.fn(() => ({ select })) } as never

    const result = await fetchEventById(supabase, 'missing')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Correr e confirmar falha**

Run: `cd mobile && npx jest lib/events.test.ts`
Expected: FAIL, `Cannot find module './events'`

- [ ] **Step 3: Implementar**

```ts
// mobile/lib/events.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export interface PublicEvent {
  id: string
  name: string
  description: string | null
  venue_name: string | null
  venue_address: string | null
  start_datetime: string
  end_datetime: string
  cover_image_url: string | null
}

const EVENT_COLUMNS =
  'id, name, description, venue_name, venue_address, start_datetime, end_datetime, cover_image_url'

export async function fetchPublicEvents(supabase: SupabaseClient): Promise<PublicEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('is_public_listed', true)
    .order('start_datetime', { ascending: true })

  if (error || !data) return []
  return data as unknown as PublicEvent[]
}

export async function fetchEventById(supabase: SupabaseClient, id: string): Promise<PublicEvent | null> {
  const { data } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('id', id)
    .single()

  return (data as unknown as PublicEvent) ?? null
}
```

- [ ] **Step 4: Correr e confirmar sucesso**

Run: `cd mobile && npx jest lib/events.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/events.ts mobile/lib/events.test.ts
git commit -m "feat(mobile): fetch de eventos publicos"
```

---

### Task 5: Componente de card de evento + estado vazio

**Files:**
- Create: `mobile/components/EventCard.tsx`
- Create: `mobile/components/EventCard.test.tsx`

- [ ] **Step 1: Escrever o teste que falha primeiro**

```tsx
// mobile/components/EventCard.test.tsx
import { describe, it, expect } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { EventCard } from './EventCard'
import type { PublicEvent } from '../lib/events'

const baseEvent: PublicEvent = {
  id: 'e1',
  name: 'Show X',
  description: 'Um grande concerto',
  venue_name: 'Altice Arena',
  venue_address: 'Lisboa',
  start_datetime: '2026-08-01T20:00:00.000Z',
  end_datetime: '2026-08-01T23:00:00.000Z',
  cover_image_url: null,
}

describe('EventCard', () => {
  it('renders name and venue', () => {
    const { getByText } = render(<EventCard event={baseEvent} />)
    expect(getByText('Show X')).toBeTruthy()
    expect(getByText('Altice Arena')).toBeTruthy()
  })

  it('shows a placeholder when there is no cover image', () => {
    const { getByTestId } = render(<EventCard event={baseEvent} />)
    expect(getByTestId('event-card-image-placeholder')).toBeTruthy()
  })

  it('renders the cover image when present', () => {
    const eventWithCover = { ...baseEvent, cover_image_url: 'https://example.com/capa.jpg' }
    const { queryByTestId } = render(<EventCard event={eventWithCover} />)
    expect(queryByTestId('event-card-image-placeholder')).toBeNull()
  })
})
```

- [ ] **Step 2: Correr e confirmar falha**

Run: `cd mobile && npx jest components/EventCard.test.tsx`
Expected: FAIL, `Cannot find module './EventCard'`

- [ ] **Step 3: Implementar**

```tsx
// mobile/components/EventCard.tsx
import { View, Text, Image, StyleSheet } from 'react-native'
import type { PublicEvent } from '../lib/events'

function formatEventDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function EventCard({ event }: { event: PublicEvent }) {
  return (
    <View style={styles.card}>
      {event.cover_image_url ? (
        <Image source={{ uri: event.cover_image_url }} style={styles.image} />
      ) : (
        <View testID="event-card-image-placeholder" style={styles.placeholder} />
      )}
      <View style={styles.content}>
        <Text style={styles.date}>{formatEventDate(event.start_datetime)}</Text>
        <Text style={styles.name}>{event.name}</Text>
        {event.venue_name && <Text style={styles.venue}>{event.venue_name}</Text>}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fafaf9', borderWidth: 1, borderColor: '#f5f5f4', borderRadius: 6, overflow: 'hidden', marginBottom: 16 },
  image: { width: '100%', height: 160 },
  placeholder: { width: '100%', height: 160, backgroundColor: '#e7e5e4' },
  content: { padding: 16 },
  date: { fontSize: 11, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  name: { fontSize: 18, fontWeight: '600', color: '#1c1917' },
  venue: { fontSize: 13, color: '#78716c', marginTop: 2 },
})
```

- [ ] **Step 4: Correr e confirmar sucesso**

Run: `cd mobile && npx jest components/EventCard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/components/EventCard.tsx mobile/components/EventCard.test.tsx
git commit -m "feat(mobile): componente de card de evento"
```

---

### Task 6: Tab Início com feed real

**Files:**
- Modify: `mobile/app/(tabs)/index.tsx`
- Create: `mobile/app/(tabs)/index.test.tsx`

- [ ] **Step 1: Escrever o teste que falha primeiro**

```tsx
// mobile/app/(tabs)/index.test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, waitFor } from '@testing-library/react-native'
import InicioScreen from './index'

const mockFetchPublicEvents = jest.fn()

jest.mock('../../lib/events', () => ({
  fetchPublicEvents: (...args: unknown[]) => mockFetchPublicEvents(...args),
}))
jest.mock('../../lib/supabase', () => ({ supabase: {} }))

beforeEach(() => {
  mockFetchPublicEvents.mockReset()
})

describe('InicioScreen', () => {
  it('shows empty state when there are no events', async () => {
    mockFetchPublicEvents.mockResolvedValue([])
    const { getByText } = render(<InicioScreen />)

    await waitFor(() => {
      expect(getByText('Sem eventos agendados.')).toBeTruthy()
    })
  })

  it('renders a list of events', async () => {
    mockFetchPublicEvents.mockResolvedValue([
      {
        id: 'e1',
        name: 'Show X',
        description: null,
        venue_name: 'Altice Arena',
        venue_address: null,
        start_datetime: '2026-08-01T20:00:00.000Z',
        end_datetime: '2026-08-01T23:00:00.000Z',
        cover_image_url: null,
      },
    ])
    const { getByText } = render(<InicioScreen />)

    await waitFor(() => {
      expect(getByText('Show X')).toBeTruthy()
    })
  })
})
```

- [ ] **Step 2: Correr e confirmar falha**

Run: `cd mobile && npx jest "app/(tabs)/index.test.tsx"`
Expected: FAIL (o placeholder atual não busca eventos nem renderiza nada que bata com as asserções)

- [ ] **Step 3: Implementar**

```tsx
// mobile/app/(tabs)/index.tsx
import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { fetchPublicEvents, type PublicEvent } from '../../lib/events'
import { EventCard } from '../../components/EventCard'

export default function InicioScreen() {
  const router = useRouter()
  const [events, setEvents] = useState<PublicEvent[] | null>(null)

  useEffect(() => {
    fetchPublicEvents(supabase).then(setEvents)
  }, [])

  if (!events) return null

  if (events.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Sem eventos agendados.</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={events}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View onTouchEnd={() => router.push(`/evento/${item.id}`)}>
          <EventCard event={item} />
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  empty: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#78716c', fontSize: 14 },
})
```

- [ ] **Step 4: Correr e confirmar sucesso**

Run: `cd mobile && npx jest "app/(tabs)/index.test.tsx"`
Expected: PASS

- [ ] **Step 5: Correr toda a suite mobile**

Run: `cd mobile && npx jest`
Expected: PASS em tudo

- [ ] **Step 6: Commit**

```bash
git add "mobile/app/(tabs)/index.tsx" "mobile/app/(tabs)/index.test.tsx"
git commit -m "feat(mobile): tab inicio com feed de eventos publicos"
```

---

### Task 7: Ecrã de detalhe do evento

**Files:**
- Create: `mobile/app/evento/[id].tsx`
- Create: `mobile/app/evento/[id].test.tsx`

- [ ] **Step 1: Escrever o teste que falha primeiro**

```tsx
// mobile/app/evento/[id].test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, waitFor } from '@testing-library/react-native'
import EventDetailScreen from './[id]'

const mockFetchEventById = jest.fn()
const mockUseLocalSearchParams = jest.fn()

jest.mock('../../lib/events', () => ({
  fetchEventById: (...args: unknown[]) => mockFetchEventById(...args),
}))
jest.mock('../../lib/supabase', () => ({ supabase: {} }))
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}))

beforeEach(() => {
  mockFetchEventById.mockReset()
  mockUseLocalSearchParams.mockReturnValue({ id: 'e1' })
})

describe('EventDetailScreen', () => {
  it('renders event details once loaded', async () => {
    mockFetchEventById.mockResolvedValue({
      id: 'e1',
      name: 'Show X',
      description: 'Um grande concerto',
      venue_name: 'Altice Arena',
      venue_address: 'Lisboa',
      start_datetime: '2026-08-01T20:00:00.000Z',
      end_datetime: '2026-08-01T23:00:00.000Z',
      cover_image_url: null,
    })
    const { getByText } = render(<EventDetailScreen />)

    await waitFor(() => {
      expect(getByText('Show X')).toBeTruthy()
    })
    expect(getByText('Um grande concerto')).toBeTruthy()
    expect(getByText('Altice Arena')).toBeTruthy()
  })

  it('shows a not-found message when the event does not exist', async () => {
    mockFetchEventById.mockResolvedValue(null)
    const { getByText } = render(<EventDetailScreen />)

    await waitFor(() => {
      expect(getByText('Evento não encontrado.')).toBeTruthy()
    })
  })
})
```

- [ ] **Step 2: Correr e confirmar falha**

Run: `cd mobile && npx jest "app/evento/[id].test.tsx"`
Expected: FAIL, `Cannot find module './[id]'`

- [ ] **Step 3: Implementar**

```tsx
// mobile/app/evento/[id].tsx
import { useEffect, useState } from 'react'
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { fetchEventById, type PublicEvent } from '../../lib/events'

function formatEventDateTime(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [event, setEvent] = useState<PublicEvent | null | undefined>(undefined)

  useEffect(() => {
    fetchEventById(supabase, id).then(setEvent)
  }, [id])

  if (event === undefined) return null

  if (event === null) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Evento não encontrado.</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      {event.cover_image_url ? (
        <Image source={{ uri: event.cover_image_url }} style={styles.hero} />
      ) : (
        <View style={styles.heroFallback} />
      )}
      <View style={styles.body}>
        <Text style={styles.name}>{event.name}</Text>
        <Text style={styles.date}>{formatEventDateTime(event.start_datetime)}</Text>
        {event.venue_name && <Text style={styles.venue}>{event.venue_name}</Text>}
        {event.venue_address && <Text style={styles.address}>{event.venue_address}</Text>}
        {event.description && <Text style={styles.description}>{event.description}</Text>}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  hero: { width: '100%', height: 260 },
  heroFallback: { width: '100%', height: 260, backgroundColor: '#111111' },
  body: { padding: 20 },
  name: { fontSize: 28, fontWeight: '700', color: '#1c1917', marginBottom: 8 },
  date: { fontSize: 14, color: '#78716c', marginBottom: 4 },
  venue: { fontSize: 14, color: '#1c1917', fontWeight: '500' },
  address: { fontSize: 13, color: '#a8a29e', marginTop: 2 },
  description: { fontSize: 14, color: '#44403c', marginTop: 16, lineHeight: 20 },
  notFound: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
  notFoundText: { color: '#78716c', fontSize: 14 },
})
```

- [ ] **Step 4: Correr e confirmar sucesso**

Run: `cd mobile && npx jest "app/evento/[id].test.tsx"`
Expected: PASS

- [ ] **Step 5: Correr toda a suite mobile**

Run: `cd mobile && npx jest`
Expected: PASS em tudo

- [ ] **Step 6: Commit**

```bash
git add "mobile/app/evento/[id].tsx" "mobile/app/evento/[id].test.tsx"
git commit -m "feat(mobile): ecra de detalhe do evento"
```

---

### Task 8: Verificação manual completa

**Files:** nenhum (checkpoint manual)

- [ ] **Step 1: Publicar um evento de teste**

No dashboard web (`npm run dev`), abrir um evento existente em `/dashboard/events/<id>/edit`, fazer upload de uma foto de capa, marcar "Publicar no app mobile", gravar.

- [ ] **Step 2: Confirmar no app mobile**

Run: `cd mobile && npx expo start`. Abrir a app (Expo Go ou simulador), sem sessão (ou com sessão de cliente), confirmar:
- Tab Início mostra o evento publicado, com a foto de capa e data corretas.
- Tocar no card abre o ecrã de detalhe com nome, data, local, morada e descrição.
- Eventos não marcados como públicos não aparecem na lista.

- [ ] **Step 3: Confirmar RLS pública**

No SQL Editor, correr a query como utilizador anónimo (papel `anon`, sem JWT) e confirmar que só devolve eventos com `is_public_listed = true`:

```sql
set role anon;
select id, name, is_public_listed from events;
reset role;
```

---

## Fora de escopo (relembrando do spec)

RSVP, bilhetes, inscrição, notificações push, partilha social além de share nativo opcional, filtros/pesquisa no feed — todos ficam para fases futuras se fizer sentido.
