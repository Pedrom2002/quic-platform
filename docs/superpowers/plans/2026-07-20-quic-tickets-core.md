# QUIC Tickets: núcleo (venda + pagamento + QR) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir a compra de bilhetes na app mobile via Stripe Checkout, emissão de QR code por bilhete, gestão de tipos de bilhete no dashboard web, e validação de entrada (check-in) por staff via scanner na app mobile.

**Architecture:** Migration nova (`ticket_types`/`tickets` + RLS + RPC `check_in_ticket`). Dashboard ganha sub-página de gestão de tipos de bilhete por evento. Backend Next.js ganha uma API route para criar Stripe Checkout Sessions e um webhook que confirma o pagamento e cria os bilhetes (fonte da verdade, nunca o cliente). App mobile ganha ecrã de compra, "Os meus bilhetes" com QR, e scanner de check-in restrito a staff.

**Tech Stack:** Next.js Server Actions + API Routes, Stripe SDK (`stripe` no lado do servidor, sem SDK no mobile), Supabase (Postgres + RLS + RPC), Expo Router, `expo-camera` (scanner), `react-native-qrcode-svg` (gerar QR no mobile).

---

## Pré-requisito: credenciais Stripe

Antes de a Task 5 (webhook) e Task 6 (checkout) poderem ser testadas contra a API real do Stripe, é preciso:
- `STRIPE_SECRET_KEY` (modo teste, `sk_test_...`) no `.env`/`.env.local` do Next.js.
- `STRIPE_WEBHOOK_SECRET` (`whsec_...`) gerado pelo Stripe CLI (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`) ou pelo dashboard Stripe após configurar o endpoint.

Sem estas variáveis, as Tasks 5-6 têm testes unitários com mocks (não precisam de chave real), mas a verificação manual (Task 9) precisa delas. Pedir ao utilizador antes de chegar à Task 9.

## Nota sobre localização de testes (regra crítica deste projeto, já repetida 3 vezes)

Ficheiros `.test.tsx`/`.test.ts` que testam ecrãs sob `mobile/app/` NUNCA vivem dentro de `mobile/app/` — Expo Router trata todo ficheiro sob `app/` como rota potencial, e um teste com `@testing-library/react-native` quebra `npx expo export --platform ios`. Todos os testes de ecrã abaixo vão para `mobile/__tests__/app/...`.

---

### Task 1: Migration `ticket_types` + `tickets` + RLS

**Files:**
- Create: `supabase/migrations/0044_quic_tickets_core.sql`

- [ ] **Step 1: Escrever a migration**

```sql
-- Quic Platform: nucleo de bilheteira propria (0044_quic_tickets_core)
-- Segue o padrao de 0040-0043: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).

CREATE TABLE ticket_types (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  price_cents     integer NOT NULL CHECK (price_cents >= 0),
  currency        text NOT NULL DEFAULT 'eur',
  quantity_total  integer NOT NULL CHECK (quantity_total >= 0),
  quantity_sold   integer NOT NULL DEFAULT 0 CHECK (quantity_sold >= 0),
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (quantity_sold <= quantity_total)
);
CREATE INDEX idx_ticket_types_event ON ticket_types(event_id);

CREATE TABLE tickets (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type_id             uuid NOT NULL REFERENCES ticket_types(id) ON DELETE RESTRICT,
  event_id                   uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  buyer_auth_user_id         uuid NOT NULL REFERENCES auth.users(id),
  qr_code                    uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status                     text NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'refunded')),
  stripe_checkout_session_id text,
  used_at                    timestamptz,
  used_by_team_member_id     uuid REFERENCES team_members(id),
  created_at                 timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tickets_buyer ON tickets(buyer_auth_user_id);
CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_qr ON tickets(qr_code);

ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_active_ticket_types" ON ticket_types
  FOR SELECT USING (is_active = true);
CREATE POLICY "members_manage_own_org_ticket_types" ON ticket_types
  FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyer_read_own_tickets" ON tickets
  FOR SELECT USING (buyer_auth_user_id = auth.uid());
CREATE POLICY "members_read_own_org_tickets" ON tickets
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE OR REPLACE FUNCTION check_in_ticket(p_qr_code uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket tickets;
BEGIN
  SELECT * INTO v_ticket FROM tickets WHERE qr_code = p_qr_code;

  IF v_ticket IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bilhete não encontrado');
  END IF;

  IF v_ticket.status = 'used' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bilhete já validado', 'used_at', v_ticket.used_at);
  END IF;

  IF v_ticket.status = 'refunded' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bilhete reembolsado');
  END IF;

  UPDATE tickets
  SET status = 'used', used_at = now(),
      used_by_team_member_id = (SELECT id FROM team_members WHERE auth_user_id = auth.uid())
  WHERE id = v_ticket.id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION check_in_ticket(uuid) FROM public;
GRANT EXECUTE ON FUNCTION check_in_ticket(uuid) TO authenticated;
```

- [ ] **Step 2: Aplicar manualmente no SQL Editor do projeto Supabase (ambiente de dev/staging)**

Corre o conteúdo do ficheiro. Confirma:

```sql
select table_name from information_schema.tables where table_name in ('ticket_types', 'tickets');
-- deve devolver 2 linhas
select proname from pg_proc where proname = 'check_in_ticket';
-- deve devolver 1 linha
```

- [ ] **Step 3: Regenerar tipos TypeScript**

Run: `npm run db:types`
Expected: `types/database.ts` passa a incluir `ticket_types`/`tickets`.

Se não houver acesso ao projeto Supabase real neste ambiente, edita `types/database.ts` manualmente: adiciona as duas tabelas ao objeto `Tables`, seguindo o padrão de `Row`/`Insert`/`Update`/`Relationships` já usado nas tabelas vizinhas (ex: `artist_agenda_items`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0044_quic_tickets_core.sql types/database.ts
git commit -m "feat(db): nucleo de bilheteira - ticket_types, tickets, check_in_ticket"
```

---

### Task 2: Instalar dependência Stripe (Next.js)

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Instalar**

Run: `npm install stripe`
Expected: `stripe` adicionado a `dependencies` em `package.json`.

- [ ] **Step 2: Confirmar tipos**

Run: `npm run typecheck`
Expected: sem erros novos.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: adiciona SDK Stripe"
```

---

### Task 3: Schema zod + server actions de tipos de bilhete (dashboard web)

**Files:**
- Create: `schemas/ticket-type.schema.ts`
- Create: `app/dashboard/events/[eventId]/tickets/actions.ts`
- Test: `__tests__/ticket-types-actions.test.ts`

- [ ] **Step 1: Escrever o schema**

```ts
// schemas/ticket-type.schema.ts
import { z } from 'zod'

export const createTicketTypeSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome demasiado longo'),
  description: z.string().max(500, 'Descrição demasiado longa').optional(),
  price_cents: z.coerce.number().int().min(0, 'Preço não pode ser negativo'),
  quantity_total: z.coerce.number().int().min(1, 'Quantidade tem de ser pelo menos 1'),
})

export const updateTicketTypeSchema = createTicketTypeSchema.partial().extend({
  is_active: z.boolean().optional(),
})

export type CreateTicketTypeInput = z.infer<typeof createTicketTypeSchema>
export type UpdateTicketTypeInput = z.infer<typeof updateTicketTypeSchema>
```

- [ ] **Step 2: Escrever o teste que falha primeiro**

```ts
// __tests__/ticket-types-actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOrgAuth, mockRevalidate } = vi.hoisted(() => ({
  mockRequireOrgAuth: vi.fn(),
  mockRevalidate: vi.fn(),
}))

vi.mock('@/lib/supabase/actions', () => ({ requireOrgAuth: mockRequireOrgAuth }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidate }))

function makeSupabase() {
  const calls: Record<string, unknown[]> = { insert: [], update: [] }
  const chain = {
    insert: vi.fn((payload: unknown) => {
      calls.insert.push(payload)
      return Promise.resolve({ error: null })
    }),
    update: vi.fn((payload: unknown) => {
      calls.update.push(payload)
      return { eq: vi.fn(() => Promise.resolve({ error: null })) }
    }),
  }
  return { supabase: { from: vi.fn(() => chain) }, calls }
}

function fd(obj: Record<string, string>) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(obj)) formData.set(key, value)
  return formData
}

const EVENT_ID = '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b'

function authAs(supabase: unknown) {
  mockRequireOrgAuth.mockResolvedValue({
    supabase,
    user: { id: 'user-1' },
    member: { organization_id: 'org-1', role: 'member' },
  })
}

beforeEach(() => {
  mockRequireOrgAuth.mockReset()
  mockRevalidate.mockReset()
})

describe('createTicketType', () => {
  it('rejects unauthenticated', async () => {
    mockRequireOrgAuth.mockRejectedValue(new Error('Não autenticado'))
    const { createTicketType } = await import('@/app/dashboard/events/[eventId]/tickets/actions')
    const result = await createTicketType(EVENT_ID, fd({ name: 'Normal', price_cents: '2000', quantity_total: '100' }))
    expect(result.error).toBe('Sem permissões')
  })

  it('rejects invalid form', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { createTicketType } = await import('@/app/dashboard/events/[eventId]/tickets/actions')
    const result = await createTicketType(EVENT_ID, fd({ name: 'A', price_cents: '2000', quantity_total: '100' }))
    expect(result.error).toContain('Nome deve ter pelo menos 2 caracteres')
  })

  it('inserts with organization_id and event_id', async () => {
    const { supabase, calls } = makeSupabase()
    authAs(supabase)
    const { createTicketType } = await import('@/app/dashboard/events/[eventId]/tickets/actions')
    const result = await createTicketType(EVENT_ID, fd({ name: 'Normal', price_cents: '2000', quantity_total: '100' }))
    expect(result.error).toBeUndefined()
    const inserted = calls.insert[0] as Record<string, unknown>
    expect(inserted.organization_id).toBe('org-1')
    expect(inserted.event_id).toBe(EVENT_ID)
    expect(inserted.price_cents).toBe(2000)
    expect(mockRevalidate).toHaveBeenCalledWith(`/dashboard/events/${EVENT_ID}/tickets`)
  })
})

describe('toggleTicketTypeActive', () => {
  it('updates is_active', async () => {
    const { supabase, calls } = makeSupabase()
    authAs(supabase)
    const { toggleTicketTypeActive } = await import('@/app/dashboard/events/[eventId]/tickets/actions')
    const result = await toggleTicketTypeActive(EVENT_ID, fd({ id: EVENT_ID, is_active: 'false' }))
    expect(result.error).toBeUndefined()
    const updated = calls.update[0] as Record<string, unknown>
    expect(updated.is_active).toBe(false)
  })
})
```

- [ ] **Step 3: Correr e confirmar falha**

Run: `npx vitest run __tests__/ticket-types-actions.test.ts`
Expected: FAIL, `Cannot find module '@/app/dashboard/events/[eventId]/tickets/actions'`

- [ ] **Step 4: Implementar**

```ts
// app/dashboard/events/[eventId]/tickets/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import * as z from 'zod'

import { requireOrgAuth } from '@/lib/supabase/actions'
import { createTicketTypeSchema, updateTicketTypeSchema } from '@/schemas/ticket-type.schema'

export type ActionResult = { error?: string }

async function getOrgClient() {
  try {
    return await requireOrgAuth()
  } catch {
    return null
  }
}

function issuesToMessage(error: z.ZodError) {
  return error.issues.map(issue => issue.message).join('; ')
}

export async function createTicketType(eventId: string, formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const parsed = createTicketTypeSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    price_cents: formData.get('price_cents'),
    quantity_total: formData.get('quantity_total'),
  })
  if (!parsed.success) return { error: issuesToMessage(parsed.error) }

  const { error } = await auth.supabase.from('ticket_types').insert({
    ...parsed.data,
    event_id: eventId,
    organization_id: auth.member.organization_id,
  })
  if (error) return { error: 'Erro ao criar tipo de bilhete' }

  revalidatePath(`/dashboard/events/${eventId}/tickets`)
  return {}
}

export async function updateTicketType(eventId: string, formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: 'Tipo de bilhete inválido' }

  const parsed = updateTicketTypeSchema.safeParse({
    name: formData.get('name') || undefined,
    description: formData.get('description') || undefined,
    price_cents: formData.get('price_cents') || undefined,
    quantity_total: formData.get('quantity_total') || undefined,
  })
  if (!parsed.success) return { error: issuesToMessage(parsed.error) }

  const { error } = await auth.supabase
    .from('ticket_types')
    .update(parsed.data)
    .eq('id', id.data)
    .eq('organization_id', auth.member.organization_id)
  if (error) return { error: 'Erro ao atualizar tipo de bilhete' }

  revalidatePath(`/dashboard/events/${eventId}/tickets`)
  return {}
}

export async function toggleTicketTypeActive(eventId: string, formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: 'Tipo de bilhete inválido' }

  const isActive = formData.get('is_active') === 'true'

  const { error } = await auth.supabase
    .from('ticket_types')
    .update({ is_active: isActive })
    .eq('id', id.data)
    .eq('organization_id', auth.member.organization_id)
  if (error) return { error: 'Erro ao atualizar o estado' }

  revalidatePath(`/dashboard/events/${eventId}/tickets`)
  return {}
}
```

- [ ] **Step 5: Correr e confirmar sucesso**

Run: `npx vitest run __tests__/ticket-types-actions.test.ts`
Expected: PASS (todos os 4 testes)

- [ ] **Step 6: Commit**

```bash
git add schemas/ticket-type.schema.ts app/dashboard/events/[eventId]/tickets/actions.ts __tests__/ticket-types-actions.test.ts
git commit -m "feat(dashboard): server actions de tipos de bilhete"
```

---

### Task 4: Página de gestão de tipos de bilhete (dashboard web)

**Files:**
- Create: `app/dashboard/events/[eventId]/tickets/page.tsx`
- Create: `app/dashboard/events/[eventId]/tickets/ticket-type-form.tsx`
- Create: `app/dashboard/events/[eventId]/tickets/ticket-type-row-actions.tsx`

- [ ] **Step 1: Página principal (server component, lista)**

```tsx
// app/dashboard/events/[eventId]/tickets/page.tsx
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { TicketTypeForm } from './ticket-type-form'
import { TicketTypeRowActions } from './ticket-type-row-actions'

export default async function TicketTypesPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('ticket_types')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at')

  const ticketTypes = data ?? []

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <Link href={`/dashboard/events/${eventId}`} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-4 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> Voltar ao evento
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Tipos de bilhete</h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Novo tipo de bilhete</h2>
        <TicketTypeForm eventId={eventId} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Vendidos</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-32 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ticketTypes.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Sem tipos de bilhete.
              </TableCell>
            </TableRow>
          )}
          {ticketTypes.map(tt => (
            <TableRow key={tt.id}>
              <TableCell className="font-medium">{tt.name}</TableCell>
              <TableCell>{(tt.price_cents / 100).toFixed(2)} €</TableCell>
              <TableCell>{tt.quantity_sold}</TableCell>
              <TableCell>{tt.quantity_total}</TableCell>
              <TableCell>{tt.is_active ? 'Ativo' : 'Inativo'}</TableCell>
              <TableCell className="text-right">
                <TicketTypeRowActions eventId={eventId} ticketType={tt} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

- [ ] **Step 2: Formulário de criação (client component)**

```tsx
// app/dashboard/events/[eventId]/tickets/ticket-type-form.tsx
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { createTicketType } from './actions'

export function TicketTypeForm({ eventId }: { eventId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createTicketType(eventId, formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Tipo de bilhete criado')
      router.refresh()
    })
  }

  return (
    <form action={handleSubmit} className="grid grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label>Nome</Label>
        <Input name="name" placeholder="ex: Normal" required />
      </div>
      <div className="space-y-1.5">
        <Label>Preço (cêntimos)</Label>
        <Input name="price_cents" type="number" min="0" placeholder="ex: 2000 = 20,00€" required />
      </div>
      <div className="space-y-1.5">
        <Label>Quantidade total</Label>
        <Input name="quantity_total" type="number" min="1" required />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'A criar...' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Ações por linha (toggle ativo)**

```tsx
// app/dashboard/events/[eventId]/tickets/ticket-type-row-actions.tsx
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'

import { toggleTicketTypeActive } from './actions'

type TicketType = Database['public']['Tables']['ticket_types']['Row']

export function TicketTypeRowActions({ eventId, ticketType }: { eventId: string; ticketType: TicketType }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('id', ticketType.id)
      formData.set('is_active', ticketType.is_active ? 'false' : 'true')
      const result = await toggleTicketTypeActive(eventId, formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(ticketType.is_active ? 'Desativado' : 'Ativado')
      router.refresh()
    })
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleToggle}>
      {ticketType.is_active ? 'Desativar' : 'Ativar'}
    </Button>
  )
}
```

- [ ] **Step 4: Verificar manualmente**

Run: `npm run dev`, abrir `/dashboard/events/<id>/tickets`. Confirma: criar tipo de bilhete funciona, aparece na tabela, toggle ativo/inativo funciona.

- [ ] **Step 5: Typecheck e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros novos.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/events/[eventId]/tickets/
git commit -m "feat(dashboard): pagina de gestao de tipos de bilhete"
```

---

### Task 5: API route de checkout Stripe

**Files:**
- Create: `app/api/tickets/checkout/route.ts`
- Test: `__tests__/tickets-checkout-route.test.ts`

- [ ] **Step 1: Escrever o teste que falha primeiro**

```ts
// __tests__/tickets-checkout-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockCreateSession, mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockCreateSession: vi.fn(),
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('stripe', () => ({
  default: class {
    checkout = { sessions: { create: mockCreateSession } }
  },
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))
vi.mock('@/lib/env', () => ({
  getEnv: () => ({ STRIPE_SECRET_KEY: 'sk_test_x', NEXT_PUBLIC_APP_URL: 'https://app.quic.pt' }),
}))

function makeRequest(body: unknown) {
  return new Request('https://app.quic.pt/api/tickets/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const TICKET_TYPE_ID = '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b'

beforeEach(() => {
  mockCreateSession.mockReset()
  mockGetUser.mockReset()
  mockFrom.mockReset()
})

describe('POST /api/tickets/checkout', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { POST } = await import('@/app/api/tickets/checkout/route')
    const res = await POST(makeRequest({ ticketTypeId: TICKET_TYPE_ID, quantity: 1 }))
    expect(res.status).toBe(401)
  })

  it('returns 404 when ticket type not found or inactive', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
    })
    const { POST } = await import('@/app/api/tickets/checkout/route')
    const res = await POST(makeRequest({ ticketTypeId: TICKET_TYPE_ID, quantity: 1 }))
    expect(res.status).toBe(404)
  })

  it('creates a checkout session and returns its url', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: { id: TICKET_TYPE_ID, name: 'Normal', price_cents: 2000, currency: 'eur' },
                error: null,
              }),
          }),
        }),
      }),
    })
    mockCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/session-123' })

    const { POST } = await import('@/app/api/tickets/checkout/route')
    const res = await POST(makeRequest({ ticketTypeId: TICKET_TYPE_ID, quantity: 2 }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.url).toBe('https://checkout.stripe.com/session-123')
    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({ currency: 'eur', unit_amount: 2000 }),
            quantity: 2,
          }),
        ],
        metadata: expect.objectContaining({ ticket_type_id: TICKET_TYPE_ID, buyer_auth_user_id: 'user-1', quantity: '2' }),
      })
    )
  })
})
```

- [ ] **Step 2: Correr e confirmar falha**

Run: `npx vitest run __tests__/tickets-checkout-route.test.ts`
Expected: FAIL, `Cannot find module '@/app/api/tickets/checkout/route'`

- [ ] **Step 3: Implementar**

```ts
// app/api/tickets/checkout/route.ts
import Stripe from 'stripe'
import * as z from 'zod'

import { createClient } from '@/lib/supabase/server'
import { getEnv } from '@/lib/env'

const bodySchema = z.object({
  ticketTypeId: z.uuid(),
  quantity: z.number().int().min(1).max(10),
})

export async function POST(request: Request) {
  const json = await request.json()
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: 'Pedido inválido' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: ticketType } = await supabase
    .from('ticket_types')
    .select('id, name, price_cents, currency')
    .eq('id', parsed.data.ticketTypeId)
    .eq('is_active', true)
    .single()

  if (!ticketType) {
    return Response.json({ error: 'Tipo de bilhete não encontrado' }, { status: 404 })
  }

  const { STRIPE_SECRET_KEY, NEXT_PUBLIC_APP_URL } = getEnv()
  const stripe = new Stripe(STRIPE_SECRET_KEY)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: ticketType.currency,
          product_data: { name: ticketType.name },
          unit_amount: ticketType.price_cents,
        },
        quantity: parsed.data.quantity,
      },
    ],
    metadata: {
      ticket_type_id: ticketType.id,
      buyer_auth_user_id: userData.user.id,
      quantity: String(parsed.data.quantity),
    },
    success_url: `${NEXT_PUBLIC_APP_URL}/api/tickets/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: 'quicapp://tickets/cancel',
  })

  return Response.json({ url: session.url })
}
```

Nota: `success_url` aponta para uma rota web intermédia (não implementada nesta fase, fora de escopo) que faria o redirect final para `quicapp://tickets/success` — para esta fase, o essencial testável é que a Checkout Session é criada corretamente; o deep-link exato de retorno pode ser ajustado quando a Task 8 (ecrã mobile de compra) for implementada, sem reabrir esta task.

- [ ] **Step 4: Correr e confirmar sucesso**

Run: `npx vitest run __tests__/tickets-checkout-route.test.ts`
Expected: PASS (todos os 3 testes)

- [ ] **Step 5: Commit**

```bash
git add app/api/tickets/checkout/route.ts __tests__/tickets-checkout-route.test.ts
git commit -m "feat(api): rota de checkout Stripe para bilhetes"
```

---

### Task 6: Webhook Stripe (fonte da verdade do pagamento)

**Files:**
- Create: `app/api/webhooks/stripe/route.ts`
- Test: `__tests__/stripe-webhook.test.ts`

- [ ] **Step 1: Escrever o teste que falha primeiro**

```ts
// __tests__/stripe-webhook.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockConstructEvent, mockFrom, mockInsert, mockUpdate } = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockFrom: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
}))

vi.mock('stripe', () => ({
  default: class {
    webhooks = { constructEvent: mockConstructEvent }
  },
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/env', () => ({
  getEnv: () => ({ STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_x' }),
}))

function makeRequest(rawBody: string, signature = 'sig_valid') {
  return new Request('https://app.quic.pt/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': signature },
    body: rawBody,
  })
}

beforeEach(() => {
  mockConstructEvent.mockReset()
  mockFrom.mockReset()
  mockInsert.mockReset()
  mockUpdate.mockReset()
})

describe('POST /api/webhooks/stripe', () => {
  it('returns 400 on invalid signature', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('invalid signature')
    })
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest('{}', 'bad_sig'))
    expect(res.status).toBe(400)
  })

  it('creates tickets on checkout.session.completed and skips duplicates', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          metadata: { ticket_type_id: 'tt-1', buyer_auth_user_id: 'user-1', quantity: '2' },
        },
      },
    })

    const existingCheck = { data: [], error: null }
    const selectChain = { eq: vi.fn(() => Promise.resolve(existingCheck)) }
    const ticketTypeChain = {
      eq: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: { event_id: 'evt-1', organization_id: 'org-1' }, error: null })) })),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tickets') {
        return {
          select: vi.fn(() => selectChain),
          insert: mockInsert.mockReturnValue(Promise.resolve({ error: null })),
        }
      }
      if (table === 'ticket_types') {
        return {
          select: vi.fn(() => ticketTypeChain),
          update: mockUpdate.mockReturnValue({ eq: vi.fn(() => Promise.resolve({ error: null })) }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    })

    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest('{}'))

    expect(res.status).toBe(200)
    expect(mockInsert).toHaveBeenCalledOnce()
    const insertedRows = mockInsert.mock.calls[0][0] as unknown[]
    expect(insertedRows).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Correr e confirmar falha**

Run: `npx vitest run __tests__/stripe-webhook.test.ts`
Expected: FAIL, `Cannot find module '@/app/api/webhooks/stripe/route'`

- [ ] **Step 3: Implementar**

```ts
// app/api/webhooks/stripe/route.ts
import Stripe from 'stripe'

import { createAdminClient } from '@/lib/supabase/admin'
import { getEnv } from '@/lib/env'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/webhooks/stripe')

export async function POST(request: Request) {
  const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } = getEnv()
  const stripe = new Stripe(STRIPE_SECRET_KEY)

  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    log.error('assinatura invalida', { error: err instanceof Error ? err.message : String(err) })
    return Response.json({ error: 'Assinatura inválida' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return Response.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const ticketTypeId = session.metadata?.ticket_type_id
  const buyerAuthUserId = session.metadata?.buyer_auth_user_id
  const quantity = Number(session.metadata?.quantity ?? '0')

  if (!ticketTypeId || !buyerAuthUserId || quantity < 1) {
    log.error('metadata em falta no evento Stripe', { sessionId: session.id })
    return Response.json({ error: 'Metadata inválida' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('tickets')
    .select('id')
    .eq('stripe_checkout_session_id', session.id)
  if (existing && existing.length > 0) {
    return Response.json({ received: true, note: 'já processado' })
  }

  const { data: ticketType } = await supabase
    .from('ticket_types')
    .select('event_id, organization_id, quantity_sold')
    .eq('id', ticketTypeId)
    .single()
  if (!ticketType) {
    log.error('ticket_type não encontrado', { ticketTypeId })
    return Response.json({ error: 'Tipo de bilhete não encontrado' }, { status: 404 })
  }

  const rows = Array.from({ length: quantity }, () => ({
    ticket_type_id: ticketTypeId,
    event_id: ticketType.event_id,
    organization_id: ticketType.organization_id,
    buyer_auth_user_id: buyerAuthUserId,
    stripe_checkout_session_id: session.id,
  }))

  const { error: insertError } = await supabase.from('tickets').insert(rows)
  if (insertError) {
    log.error('erro ao criar bilhetes', { error: insertError.message })
    return Response.json({ error: 'Erro ao criar bilhetes' }, { status: 500 })
  }

  await supabase
    .from('ticket_types')
    .update({ quantity_sold: ticketType.quantity_sold + quantity })
    .eq('id', ticketTypeId)

  return Response.json({ received: true })
}
```

- [ ] **Step 4: Correr e confirmar sucesso**

Run: `npx vitest run __tests__/stripe-webhook.test.ts`
Expected: PASS (todos os 2 testes)

- [ ] **Step 5: Commit**

```bash
git add app/api/webhooks/stripe/route.ts __tests__/stripe-webhook.test.ts
git commit -m "feat(api): webhook Stripe cria bilhetes apos pagamento confirmado"
```

---

### Task 7: `mobile/lib/tickets.ts` e `mobile/lib/checkin.ts`

**Files:**
- Create: `mobile/lib/tickets.ts`
- Create: `mobile/lib/tickets.test.ts`
- Create: `mobile/lib/checkin.ts`
- Create: `mobile/lib/checkin.test.ts`

- [ ] **Step 1: Escrever os testes que falham primeiro**

```ts
// mobile/lib/tickets.test.ts
import { describe, it, expect, jest } from '@jest/globals'
import { fetchTicketTypes, fetchMyTickets } from './tickets'

describe('fetchTicketTypes', () => {
  it('queries active ticket types for an event', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: 'tt1', name: 'Normal', price_cents: 2000, quantity_total: 100, quantity_sold: 10 }],
      error: null,
    })
    const eq2 = jest.fn(() => ({ order }))
    const eq1 = jest.fn(() => ({ eq: eq2 }))
    const select = jest.fn(() => ({ eq: eq1 }))
    const supabase = { from: jest.fn(() => ({ select })) } as never

    const result = await fetchTicketTypes(supabase, 'event-1')

    expect(eq1).toHaveBeenCalledWith('event_id', 'event-1')
    expect(eq2).toHaveBeenCalledWith('is_active', true)
    expect(result).toHaveLength(1)
  })

  it('returns empty array on error', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    const eq2 = jest.fn(() => ({ order }))
    const eq1 = jest.fn(() => ({ eq: eq2 }))
    const select = jest.fn(() => ({ eq: eq1 }))
    const supabase = { from: jest.fn(() => ({ select })) } as never

    const result = await fetchTicketTypes(supabase, 'event-1')
    expect(result).toEqual([])
  })
})

describe('fetchMyTickets', () => {
  it('queries tickets for the current buyer', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: 't1', qr_code: 'qr-1', status: 'valid', event_id: 'event-1' }],
      error: null,
    })
    const eq = jest.fn(() => ({ order }))
    const select = jest.fn(() => ({ eq }))
    const getUser = jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const supabase = { from: jest.fn(() => ({ select })), auth: { getUser } } as never

    const result = await fetchMyTickets(supabase)

    expect(eq).toHaveBeenCalledWith('buyer_auth_user_id', 'user-1')
    expect(result).toHaveLength(1)
  })

  it('returns empty array when there is no session', async () => {
    const getUser = jest.fn().mockResolvedValue({ data: { user: null } })
    const supabase = { from: jest.fn(), auth: { getUser } } as never

    const result = await fetchMyTickets(supabase)
    expect(result).toEqual([])
  })
})
```

- [ ] **Step 2: Correr e confirmar falha**

Run: `cd mobile && npx jest lib/tickets.test.ts`
Expected: FAIL, `Cannot find module './tickets'`

- [ ] **Step 3: Implementar `mobile/lib/tickets.ts`**

```ts
// mobile/lib/tickets.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export interface TicketType {
  id: string
  name: string
  price_cents: number
  quantity_total: number
  quantity_sold: number
}

export interface MyTicket {
  id: string
  qr_code: string
  status: string
  event_id: string
}

export async function fetchTicketTypes(supabase: SupabaseClient, eventId: string): Promise<TicketType[]> {
  const { data, error } = await supabase
    .from('ticket_types')
    .select('id, name, price_cents, quantity_total, quantity_sold')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .order('price_cents')

  if (error || !data) return []
  return data as unknown as TicketType[]
}

export async function fetchMyTickets(supabase: SupabaseClient): Promise<MyTicket[]> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return []

  const { data, error } = await supabase
    .from('tickets')
    .select('id, qr_code, status, event_id')
    .eq('buyer_auth_user_id', userData.user.id)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as unknown as MyTicket[]
}

export async function createCheckoutSession(
  appBaseUrl: string,
  ticketTypeId: string,
  quantity: number,
  accessToken: string
): Promise<string | null> {
  const response = await fetch(`${appBaseUrl}/api/tickets/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ ticketTypeId, quantity }),
  })
  if (!response.ok) return null
  const body = await response.json()
  return body.url ?? null
}
```

Nota: a Task 5 (rota `/api/tickets/checkout`) usa `createClient()` do lado do servidor (cookies de sessão web). Para o mobile chamar a mesma rota autenticado, é necessário que essa rota também aceite um `Authorization: Bearer <token>` e valide via `supabase.auth.getUser(token)` quando não há cookie de sessão — ajuste a fazer na Task 5 caso a verificação manual (Task 10) mostre 401 vindo do mobile mesmo autenticado. Registado aqui para não ser esquecido, mas não bloqueia a implementação desta task.

- [ ] **Step 4: Implementar `mobile/lib/checkin.ts`**

```ts
// mobile/lib/checkin.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export interface CheckInResult {
  success: boolean
  error?: string
}

export async function checkInTicket(supabase: SupabaseClient, qrCode: string): Promise<CheckInResult> {
  const { data, error } = await supabase.rpc('check_in_ticket', { p_qr_code: qrCode })
  if (error) return { success: false, error: 'Erro ao validar bilhete' }
  return data as CheckInResult
}
```

```ts
// mobile/lib/checkin.test.ts
import { describe, it, expect, jest } from '@jest/globals'
import { checkInTicket } from './checkin'

describe('checkInTicket', () => {
  it('calls the check_in_ticket RPC and returns its result', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { success: true }, error: null })
    const supabase = { rpc } as never

    const result = await checkInTicket(supabase, 'qr-123')

    expect(rpc).toHaveBeenCalledWith('check_in_ticket', { p_qr_code: 'qr-123' })
    expect(result).toEqual({ success: true })
  })

  it('returns a generic error when the RPC call itself fails', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    const supabase = { rpc } as never

    const result = await checkInTicket(supabase, 'qr-123')
    expect(result).toEqual({ success: false, error: 'Erro ao validar bilhete' })
  })
})
```

- [ ] **Step 5: Correr e confirmar sucesso**

Run: `cd mobile && npx jest --runInBand lib/tickets.test.ts lib/checkin.test.ts`
Expected: PASS (todos os testes)

- [ ] **Step 6: Correr toda a suite mobile**

Run: `cd mobile && npx jest --runInBand`
Expected: PASS em tudo

- [ ] **Step 7: Commit**

```bash
git add mobile/lib/tickets.ts mobile/lib/tickets.test.ts mobile/lib/checkin.ts mobile/lib/checkin.test.ts
git commit -m "feat(mobile): fetch de bilhetes e check-in via RPC"
```

---

### Task 8: `resolveUserRole` estende para `staff`

**Files:**
- Modify: `mobile/lib/role.ts`
- Modify: `mobile/lib/role.test.ts`

- [ ] **Step 1: Ler o ficheiro atual e o teste atual antes de alterar**

Ler `mobile/lib/role.ts` e `mobile/lib/role.test.ts` para confirmar a assinatura exata de `resolveUserRole` e o tipo `UserRole` já existentes antes de estender — a mudança deve ser aditiva (adiciona um novo caso ao union type e um novo branch de resolução), não deve alterar o comportamento de `client`/`artist`/`guest` já testado.

- [ ] **Step 2: Escrever o teste do novo caso que falha primeiro**

Adicionar a `mobile/lib/role.test.ts`, dentro do `describe('resolveUserRole', ...)` já existente:

```ts
  it('returns staff role when team_members row found (and no artist row)', async () => {
    const artistSingle = jest.fn().mockResolvedValue({ data: null, error: null })
    const artistEq = jest.fn(() => ({ single: artistSingle }))
    const artistSelect = jest.fn(() => ({ eq: artistEq }))

    const staffSingle = jest.fn().mockResolvedValue({
      data: { id: 'member-1', full_name: 'João Staff', role: 'manager' },
      error: null,
    })
    const staffEq = jest.fn(() => ({ single: staffSingle }))
    const staffSelect = jest.fn(() => ({ eq: staffEq }))

    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'artists') return { select: artistSelect }
        if (table === 'team_members') return { select: staffSelect }
        throw new Error(`unexpected table ${table}`)
      }),
    } as never

    const session = { user: { id: 'auth-user-3' } } as never
    const result = await resolveUserRole(supabase, session)

    expect(staffSelect).toHaveBeenCalledWith('id, full_name, role')
    expect(staffEq).toHaveBeenCalledWith('auth_user_id', 'auth-user-3')
    expect(result).toEqual({
      role: 'staff',
      member: { id: 'member-1', full_name: 'João Staff', role: 'manager' },
    })
  })
```

- [ ] **Step 3: Correr e confirmar falha**

Run: `cd mobile && npx jest --runInBand lib/role.test.ts`
Expected: FAIL, o novo teste não corresponde ao comportamento atual (devolve `client`, não `staff`)

- [ ] **Step 4: Implementar a extensão**

No `mobile/lib/role.ts` atual, adicionar depois da verificação de `artists` não encontrar nada e antes do fallback final para `client`:

```ts
const { data: staffData } = await supabase
  .from('team_members')
  .select('id, full_name, role')
  .eq('auth_user_id', session.user.id)
  .single()

if (staffData) {
  return { role: 'staff', member: staffData }
}

return { role: 'client' }
```

Atualizar o tipo `UserRole` (union type já existente em `mobile/lib/role.ts`) para incluir:

```ts
| { role: 'staff'; member: { id: string; full_name: string; role: string } }
```

- [ ] **Step 5: Correr e confirmar sucesso**

Run: `cd mobile && npx jest --runInBand lib/role.test.ts`
Expected: PASS (todos os testes, incluindo os já existentes de `client`/`artist`/`guest`)

- [ ] **Step 6: Correr toda a suite mobile**

Run: `cd mobile && npx jest --runInBand`
Expected: PASS em tudo (nenhuma regressão nos consumidores existentes de `resolveUserRole`, ex: `mobile/app/(tabs)/portal.tsx`)

- [ ] **Step 7: Commit**

```bash
git add mobile/lib/role.ts mobile/lib/role.test.ts
git commit -m "feat(mobile): resolveUserRole reconhece staff via team_members"
```

---

### Task 9: Ecrãs mobile — comprar bilhete, "Os meus bilhetes", scanner

**Files:**
- Modify: `mobile/app/evento/[id].tsx`
- Modify: `mobile/__tests__/app/evento/[id].test.tsx` (já existe de uma fase anterior — ler antes de estender, não substituir os testes já lá)
- Create: `mobile/app/tickets/index.tsx`
- Create: `mobile/__tests__/app/tickets/index.test.tsx`
- Create: `mobile/app/scanner.tsx`
- Create: `mobile/__tests__/app/scanner.test.tsx`
- Modify: `mobile/package.json` (adicionar `expo-camera`, `react-native-qrcode-svg`, `react-native-svg`)

- [ ] **Step 1: Instalar dependências mobile**

Run: `cd mobile && npx expo install expo-camera react-native-qrcode-svg react-native-svg`
Expected: pacotes adicionados a `mobile/package.json`.

- [ ] **Step 2: Ler o ecrã de detalhe de evento atual**

Ler `mobile/app/evento/[id].tsx` (já existe da fase 2) e `mobile/__tests__/app/evento/[id].test.tsx` antes de o modificar — este passo ADICIONA uma secção de tipos de bilhete + botão comprar, não substitui o ecrã existente (hero, nome, data, morada, descrição continuam intactos).

- [ ] **Step 3: Escrever o teste que falha primeiro para "Os meus bilhetes"**

```tsx
// mobile/__tests__/app/tickets/index.test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, waitFor } from '@testing-library/react-native'
import MyTicketsScreen from '../../../app/tickets/index'

const mockFetchMyTickets = jest.fn()

jest.mock('../../../lib/tickets', () => ({
  fetchMyTickets: (...args: unknown[]) => mockFetchMyTickets(...args),
}))
jest.mock('../../../lib/supabase', () => ({ supabase: {} }))
jest.mock('react-native-qrcode-svg', () => 'QRCode')

beforeEach(() => {
  mockFetchMyTickets.mockReset()
})

describe('MyTicketsScreen', () => {
  it('shows empty state when there are no tickets', async () => {
    mockFetchMyTickets.mockResolvedValue([])
    const { getByText } = render(<MyTicketsScreen />)

    await waitFor(() => {
      expect(getByText('Ainda não tens bilhetes.')).toBeTruthy()
    })
  })

  it('renders a ticket with its qr code', async () => {
    mockFetchMyTickets.mockResolvedValue([
      { id: 't1', qr_code: 'qr-abc-123', status: 'valid', event_id: 'event-1' },
    ])
    const { getByText, queryByText } = render(<MyTicketsScreen />)

    await waitFor(() => {
      expect(queryByText('Ainda não tens bilhetes.')).toBeNull()
    })
    expect(getByText('Válido')).toBeTruthy()
  })
})
```

- [ ] **Step 4: Correr e confirmar falha**

Run: `cd mobile && npx jest --runInBand -t "MyTicketsScreen"`
Expected: FAIL, `Cannot find module '../../../app/tickets/index'`

- [ ] **Step 5: Implementar `mobile/app/tickets/index.tsx`**

```tsx
// mobile/app/tickets/index.tsx
import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { supabase } from '../../lib/supabase'
import { fetchMyTickets, type MyTicket } from '../../lib/tickets'

const STATUS_LABELS: Record<string, string> = {
  valid: 'Válido',
  used: 'Utilizado',
  refunded: 'Reembolsado',
}

export default function MyTicketsScreen() {
  const [tickets, setTickets] = useState<MyTicket[] | null>(null)

  useEffect(() => {
    fetchMyTickets(supabase).then(setTickets)
  }, [])

  if (!tickets) return null

  if (tickets.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Ainda não tens bilhetes.</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={tickets}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <QRCode value={item.qr_code} size={160} />
          <Text style={styles.status}>{STATUS_LABELS[item.status] ?? item.status}</Text>
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  empty: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#78716c', fontSize: 14 },
  card: { backgroundColor: '#fafaf9', borderWidth: 1, borderColor: '#f5f5f4', borderRadius: 6, padding: 20, alignItems: 'center', gap: 12, marginBottom: 12 },
  status: { fontSize: 12, color: '#78716c', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
})
```

- [ ] **Step 6: Correr e confirmar sucesso**

Run: `cd mobile && npx jest --runInBand -t "MyTicketsScreen"`
Expected: PASS

- [ ] **Step 7: Escrever o teste do scanner que falha primeiro**

```tsx
// mobile/__tests__/app/scanner.test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, waitFor } from '@testing-library/react-native'
import ScannerScreen from '../../app/scanner'

const mockUseSession = jest.fn()
const mockResolveUserRole = jest.fn()

jest.mock('../../hooks/useSession', () => ({ useSession: () => mockUseSession() }))
jest.mock('../../lib/role', () => ({ resolveUserRole: (...args: unknown[]) => mockResolveUserRole(...args) }))
jest.mock('../../lib/supabase', () => ({ supabase: {} }))
jest.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
}))

beforeEach(() => {
  mockUseSession.mockReset()
  mockResolveUserRole.mockReset()
})

describe('ScannerScreen', () => {
  it('shows restricted message for non-staff roles', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'client' })

    const { getByText } = render(<ScannerScreen />)

    await waitFor(() => {
      expect(getByText('Acesso reservado à equipa Quic')).toBeTruthy()
    })
  })

  it('renders the camera for staff role', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockResolveUserRole.mockResolvedValue({ role: 'staff', member: { id: 'm1', full_name: 'João', role: 'manager' } })

    const { queryByText } = render(<ScannerScreen />)

    await waitFor(() => {
      expect(queryByText('Acesso reservado à equipa Quic')).toBeNull()
    })
  })
})
```

- [ ] **Step 8: Correr e confirmar falha**

Run: `cd mobile && npx jest --runInBand -t "ScannerScreen"`
Expected: FAIL, `Cannot find module '../../app/scanner'`

- [ ] **Step 9: Implementar `mobile/app/scanner.tsx`**

```tsx
// mobile/app/scanner.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useSession } from '../hooks/useSession'
import { resolveUserRole, type UserRole } from '../lib/role'
import { supabase } from '../lib/supabase'
import { checkInTicket } from '../lib/checkin'

export default function ScannerScreen() {
  const { session } = useSession()
  const [role, setRole] = useState<UserRole | null>(null)
  const [permission, requestPermission] = useCameraPermissions()
  const [lastResult, setLastResult] = useState<string | null>(null)

  useEffect(() => {
    resolveUserRole(supabase, session).then(setRole)
  }, [session])

  useEffect(() => {
    if (permission && !permission.granted) requestPermission()
  }, [permission, requestPermission])

  if (!role) return null

  if (role.role !== 'staff') {
    return (
      <View style={styles.center}>
        <Text style={styles.restricted}>Acesso reservado à equipa Quic</Text>
      </View>
    )
  }

  async function handleScan({ data }: { data: string }) {
    const result = await checkInTicket(supabase, data)
    setLastResult(result.success ? 'Bilhete validado' : (result.error ?? 'Erro'))
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleScan}
      />
      {lastResult && (
        <View style={styles.resultBanner}>
          <Text style={styles.resultText}>{lastResult}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  camera: { flex: 1 },
  center: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  restricted: { color: '#57534e', fontSize: 14, textAlign: 'center' },
  resultBanner: { position: 'absolute', bottom: 40, left: 24, right: 24, backgroundColor: '#111111', padding: 16, borderRadius: 6 },
  resultText: { color: '#ffffff', textAlign: 'center', fontWeight: '600' },
})
```

- [ ] **Step 10: Correr e confirmar sucesso**

Run: `cd mobile && npx jest --runInBand -t "ScannerScreen"`
Expected: PASS

- [ ] **Step 11: Adicionar secção de compra ao ecrã de detalhe de evento**

Ler o conteúdo atual de `mobile/app/evento/[id].tsx` e do seu teste (`mobile/__tests__/app/evento/[id].test.tsx`) antes de editar.

Adicionar ao topo do ficheiro os imports novos:

```ts
import { Linking } from 'react-native'
import { fetchTicketTypes, createCheckoutSession, type TicketType } from '../../lib/tickets'
```

Adicionar estado e efeito dentro do componente `EventDetailScreen` (após o estado `event` já existente):

```ts
const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])

useEffect(() => {
  if (event) fetchTicketTypes(supabase, event.id).then(setTicketTypes)
}, [event])

async function handleBuy(ticketTypeId: string) {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) return
  const url = await createCheckoutSession(process.env.EXPO_PUBLIC_APP_URL!, ticketTypeId, 1, accessToken)
  if (url) Linking.openURL(url)
}
```

Adicionar ao JSX, depois da secção de descrição já existente (sem remover nada):

```tsx
{ticketTypes.length > 0 && (
  <View style={styles.ticketsSection}>
    <Text style={styles.ticketsTitle}>Bilhetes</Text>
    {ticketTypes.map(tt => (
      <Pressable key={tt.id} style={styles.ticketRow} onPress={() => handleBuy(tt.id)}>
        <Text style={styles.ticketName}>{tt.name}</Text>
        <Text style={styles.ticketPrice}>{(tt.price_cents / 100).toFixed(2)} €</Text>
      </Pressable>
    ))}
  </View>
)}
```

Adicionar aos `styles` já existentes (sem remover nenhum estilo existente):

```ts
ticketsSection: { marginTop: 24, gap: 8 },
ticketsTitle: { fontSize: 16, fontWeight: '700', color: '#1c1917', marginBottom: 4 },
ticketRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fafaf9', borderWidth: 1, borderColor: '#f5f5f4', borderRadius: 6, padding: 14 },
ticketName: { fontSize: 14, fontWeight: '600', color: '#1c1917' },
ticketPrice: { fontSize: 14, color: '#78716c' },
```

Nota: `Pressable` já deve estar importado de `react-native` neste ficheiro (usado no fase 2); confirmar antes de duplicar o import — se já lá estiver, adicionar apenas `Linking` à lista de imports de `react-native` já existente.

Estender `mobile/__tests__/app/evento/[id].test.tsx` com um novo teste, seguindo a mesma convenção de mocks já usada nesse ficheiro para `fetchEventById`:

```tsx
  it('shows ticket types and opens checkout url on purchase press', async () => {
    mockFetchEventById.mockResolvedValue({
      id: 'event-1',
      name: 'Show X',
      description: null,
      venue_name: null,
      venue_address: null,
      start_datetime: '2026-08-01T20:00:00.000Z',
      end_datetime: '2026-08-01T23:00:00.000Z',
      cover_image_url: null,
    })
    mockFetchTicketTypes.mockResolvedValue([
      { id: 'tt-1', name: 'Normal', price_cents: 2000, quantity_total: 100, quantity_sold: 0 },
    ])
    mockCreateCheckoutSession.mockResolvedValue('https://checkout.stripe.com/session-abc')

    const { getByText } = render(<EventDetailScreen />)

    await waitFor(() => {
      expect(getByText('Normal')).toBeTruthy()
    })

    fireEvent.press(getByText('Normal'))

    await waitFor(() => {
      expect(mockOpenURL).toHaveBeenCalledWith('https://checkout.stripe.com/session-abc')
    })
  })
```

Adicionar ao topo do mesmo ficheiro de teste os mocks correspondentes (junto aos já existentes de `fetchEventById`):

```ts
const mockFetchTicketTypes = jest.fn()
const mockCreateCheckoutSession = jest.fn()
const mockOpenURL = jest.fn()

jest.mock('../../../lib/tickets', () => ({
  fetchTicketTypes: (...args: unknown[]) => mockFetchTicketTypes(...args),
  createCheckoutSession: (...args: unknown[]) => mockCreateCheckoutSession(...args),
}))
```

E mockar `Linking.openURL` (`react-native`'s `Linking` já é usado por outros ecrãs neste projeto — seguir o mesmo padrão de mock já usado, por exemplo em `mobile/__tests__/app/(tabs)/portal.test.tsx` para `Linking`, se esse mock já existir; caso não exista ainda nesse ficheiro específico, adicionar `jest.mock('react-native', () => ({ ...jest.requireActual('react-native'), Linking: { openURL: mockOpenURL } }))`).

Também mockar `supabase.auth.getSession` no mock já existente de `../../../lib/supabase` desse ficheiro, devolvendo `{ data: { session: { access_token: 'token-abc' } } }`.

- [ ] **Step 12: Correr toda a suite mobile**

Run: `cd mobile && npx jest --runInBand`
Expected: PASS em tudo

- [ ] **Step 13: Verificar que o bundle continua a exportar**

Run: `cd mobile && npx expo export --platform ios`
Expected: sucesso, sem erro de `Unable to resolve module console` (confirma que nenhum teste ficou dentro de `mobile/app/`)

Depois: `rm -rf mobile/dist`

- [ ] **Step 14: Commit**

```bash
git add mobile/app/tickets/ mobile/app/scanner.tsx mobile/app/evento/ mobile/__tests__/app/tickets/ mobile/__tests__/app/scanner.test.tsx mobile/__tests__/app/evento/ mobile/package.json mobile/package-lock.json
git commit -m "feat(mobile): compra de bilhete, os meus bilhetes, scanner de check-in"
```

---

### Task 10: Verificação manual completa (precisa de credenciais Stripe reais)

**Files:** nenhum (checkpoint manual)

- [ ] **Step 1: Configurar Stripe de teste**

No `.env.local` do Next.js: `STRIPE_SECRET_KEY=sk_test_...`. Correr `stripe listen --forward-to localhost:3000/api/webhooks/stripe` (Stripe CLI) para obter `STRIPE_WEBHOOK_SECRET=whsec_...` localmente.

- [ ] **Step 2: Criar um tipo de bilhete de teste**

No dashboard web (`npm run dev`), `/dashboard/events/<id>/tickets`, criar um tipo de bilhete (ex: "Normal", 2000 cêntimos, 10 unidades).

- [ ] **Step 3: Comprar na app mobile**

`cd mobile && npx expo start`. Abrir o evento correspondente, tocar num tipo de bilhete, completar o checkout Stripe com um cartão de teste (`4242 4242 4242 4242`, qualquer data futura/CVC). Confirmar que "Os meus bilhetes" mostra o QR code novo depois do pagamento.

- [ ] **Step 4: Testar check-in**

Login como staff (um `team_members` existente convidado no dashboard, ou o próprio utilizador que criou a organização). Abrir `/scanner`, apontar a câmara ao QR gerado no passo anterior. Confirmar "Bilhete validado". Tentar escanear o mesmo QR outra vez — deve mostrar "Bilhete já validado".

---

## Fora de escopo (relembrando do spec)

Wallet, transferência entre utilizadores, revenda autorizada, estatísticas avançadas, reembolsos automáticos.
