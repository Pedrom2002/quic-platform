# Cleanup & Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all remaining `any` types, expand test coverage for the three new action files, guard the portal URL, and DRY up `resolveOrgMember`.

**Architecture:** Pure refactors + additions — no schema or DB changes. All changes are in TypeScript/TSX. Tests use Vitest with the existing mock pattern (dynamic imports + `vi.resetModules()`).

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase, Vitest, Zod

---

## File Map

| File | Change |
|------|--------|
| `app/dashboard/events/[eventId]/notifications/page.tsx` | Replace `as any` with inline types |
| `app/dashboard/events/[eventId]/clients/page.tsx` | Replace `any[]` with `EventClientWithDetails[]` |
| `lib/supabase/actions.ts` | **Create** — shared `resolveOrgMember` (org_id only) |
| `app/dashboard/clients/actions.ts` | Import from `lib/supabase/actions.ts` |
| `app/dashboard/templates/actions.ts` | Import from `lib/supabase/actions.ts` |
| `app/dashboard/events/[eventId]/actions.ts` | Import + add portal URL guard |
| `app/dashboard/events/[eventId]/clients/actions.ts` | Import from `lib/supabase/actions.ts` |
| `__tests__/clients-actions.test.ts` | **Create** — tests for `clients/actions.ts` |
| `__tests__/templates-actions.test.ts` | **Create** — tests for `templates/actions.ts` |
| `__tests__/send-portal-link.test.ts` | **Create** — tests for `sendPortalLinkAction` |

> **Note:** `app/api/events/[eventId]/checklist-items/[itemId]/route.ts` uses `resolveOrgMember` with a wider select (`id, full_name, organization_id`). That file keeps its own local copy since the shape differs.

---

### Task 1: Fix `as any` in notifications/page.tsx

**Files:**
- Modify: `app/dashboard/events/[eventId]/notifications/page.tsx:60-61`

The Supabase query on line 40 is:
```ts
.select('*, client:clients(full_name, email), checklist_item:event_checklist_items(title, client_label)')
```
Supabase returns these as properties `client` and `checklist_item` on each row (aliased joins).

- [ ] **Step 1: Add inline types and remove `as any`**

Replace lines 59-62 in `app/dashboard/events/[eventId]/notifications/page.tsx`:

```ts
// BEFORE
const client = job.client as any
const item = job.checklist_item as any
```

```ts
// AFTER — add these two type aliases just above the jobs.map call (inside the JSX, before the map):
type JobClient = { full_name: string; email: string | null } | null
type JobItem = { title: string; client_label: string | null } | null

// then change lines 60-61:
const client = job.client as JobClient
const item = job.checklist_item as JobItem
```

Full replacement block (lines 59-62):
```tsx
{jobs.map(job => {
  type JobClient = { full_name: string; email: string | null } | null
  type JobItem = { title: string; client_label: string | null } | null
  const client = job.client as JobClient
  const item = job.checklist_item as JobItem
  const cfg = statusConfig[job.status] ?? statusConfig.queued
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: zero new errors.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/events/eventId/notifications/page.tsx
git commit -m "fix: replace as-any in notifications page with inline types"
```

---

### Task 2: Fix `any[]` in event clients page

**Files:**
- Modify: `app/dashboard/events/[eventId]/clients/page.tsx:32`

- [ ] **Step 1: Add import and fix state type**

At the top of `app/dashboard/events/[eventId]/clients/page.tsx`, the import block already has:
```ts
import type { Client } from '@/types/database'
```

Add `EventClientWithDetails` to the import:
```ts
import type { EventClientWithDetails } from '@/types/app'
```

Then on line 32 change:
```ts
// BEFORE
const [eventClients, setEventClients] = useState<any[]>([])

// AFTER
const [eventClients, setEventClients] = useState<EventClientWithDetails[]>([])
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: zero new errors. If the `client` property access downstream now shows type errors, it means `loadEventClientsAction` returns a slightly different shape — check the return type of that action and align the type if needed (most likely the select `'*, client:clients(*)'` returns `Client` which matches the `EventClientWithDetails.client` shape).

- [ ] **Step 3: Commit**

```bash
git add "app/dashboard/events/[eventId]/clients/page.tsx"
git commit -m "fix: type eventClients state as EventClientWithDetails[]"
```

---

### Task 3: Extract shared `resolveOrgMember` to `lib/supabase/actions.ts`

**Files:**
- Create: `lib/supabase/actions.ts`
- Modify: `app/dashboard/clients/actions.ts`
- Modify: `app/dashboard/templates/actions.ts`
- Modify: `app/dashboard/events/[eventId]/actions.ts`
- Modify: `app/dashboard/events/[eventId]/clients/actions.ts`

The API route (`app/api/events/[eventId]/checklist-items/[itemId]/route.ts`) selects `id, full_name, organization_id` (wider shape) so it is intentionally excluded.

- [ ] **Step 1: Create the shared helper**

Create `lib/supabase/actions.ts`:
```ts
import { createClient } from '@/lib/supabase/server'

export async function resolveOrgMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ organization_id: string } | null> {
  const { data } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('auth_user_id', userId)
    .single()
  return data
}
```

- [ ] **Step 2: Update `app/dashboard/clients/actions.ts`**

Remove the local `resolveOrgMember` function (lines 5-12) and add import at top:
```ts
import { resolveOrgMember } from '@/lib/supabase/actions'
```

The function body stays identical — just import replaces the local definition.

- [ ] **Step 3: Update `app/dashboard/templates/actions.ts`**

Same as Step 2 — remove local `resolveOrgMember` (lines 6-13), add:
```ts
import { resolveOrgMember } from '@/lib/supabase/actions'
```

- [ ] **Step 4: Update `app/dashboard/events/[eventId]/actions.ts`**

Remove local `resolveOrgMember` (lines 6-13), add:
```ts
import { resolveOrgMember } from '@/lib/supabase/actions'
```

- [ ] **Step 5: Update `app/dashboard/events/[eventId]/clients/actions.ts`**

Remove local `resolveOrgMember` (lines 5-12), add:
```ts
import { resolveOrgMember } from '@/lib/supabase/actions'
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add lib/supabase/actions.ts \
  "app/dashboard/clients/actions.ts" \
  "app/dashboard/templates/actions.ts" \
  "app/dashboard/events/[eventId]/actions.ts" \
  "app/dashboard/events/[eventId]/clients/actions.ts"
git commit -m "refactor: extract resolveOrgMember to lib/supabase/actions"
```

---

### Task 4: Guard portal URL in `sendPortalLinkAction`

**Files:**
- Modify: `app/dashboard/events/[eventId]/actions.ts:37-38`

Current code (lines 37-38):
```ts
const portalBase = process.env.NEXT_PUBLIC_PORTAL_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
const portalUrl = `${portalBase}/portal/${event.portal_token}`
```
If both env vars are missing, `portalBase` is `''` and the URL becomes `/portal/<token>` — a relative path in emails, which is useless.

- [ ] **Step 1: Add guard**

Replace lines 37-38:
```ts
// BEFORE
const portalBase = process.env.NEXT_PUBLIC_PORTAL_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
const portalUrl = `${portalBase}/portal/${event.portal_token}`

// AFTER
const portalBase = process.env.NEXT_PUBLIC_PORTAL_URL ?? process.env.NEXT_PUBLIC_APP_URL
if (!portalBase) throw new Error('NEXT_PUBLIC_APP_URL não configurado')
const portalUrl = `${portalBase}/portal/${event.portal_token}`
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add "app/dashboard/events/[eventId]/actions.ts"
git commit -m "fix: guard portal URL — throw if env var missing"
```

---

### Task 5: Tests for `clients/actions.ts`

**Files:**
- Create: `__tests__/clients-actions.test.ts`

Pattern: same mock setup as `dispatcher.test.ts` — `vi.resetModules()` in `beforeEach` + dynamic import of module under test. All Supabase calls are mocked via `vi.mock('@/lib/supabase/server')`. All `resolveOrgMember` calls go through the mocked Supabase client.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/clients-actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockUpdate = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

// Minimal chainable builder
function makeQuery(result: unknown) {
  const q: Record<string, unknown> = {}
  q.then = (res: (v: unknown) => void) => Promise.resolve(result).then(res)
  q.catch = (rej: (e: unknown) => void) => Promise.resolve(result).catch(rej)
  const chain = () => makeQuery(result)
  q.select = vi.fn(chain)
  q.eq = vi.fn(chain)
  q.single = vi.fn(chain)
  q.update = vi.fn((...args: unknown[]) => { mockUpdate(...args); return makeQuery(result) })
  q.order = vi.fn(chain)
  return q
}

// Per-call result queue: each call to supabase.from() pops one result
let fromResults: unknown[] = []
const supabaseMock = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => {
    const result = fromResults.shift() ?? { data: null, error: null }
    return makeQuery(result)
  }),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(supabaseMock),
}))
vi.mock('@/lib/supabase/actions', () => ({
  resolveOrgMember: vi.fn(),
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('clients actions', () => {
  let resolveOrgMember: ReturnType<typeof vi.fn>
  let updateClientAction: (id: string, updates: { full_name: string; email: string; phone: string; company: string }) => Promise<void>
  let deactivateClientAction: (id: string) => Promise<void>
  let loadClientsAction: () => Promise<unknown[]>

  beforeEach(async () => {
    vi.resetModules()
    fromResults = []
    mockUpdate.mockReset()
    supabaseMock.auth.getUser.mockReset()
    supabaseMock.from.mockClear()

    const actionsModule = await import('@/app/dashboard/clients/actions')
    updateClientAction = actionsModule.updateClientAction
    deactivateClientAction = actionsModule.deactivateClientAction
    loadClientsAction = actionsModule.loadClientsAction

    const actionsHelpers = await import('@/lib/supabase/actions')
    resolveOrgMember = actionsHelpers.resolveOrgMember as ReturnType<typeof vi.fn>
  })

  describe('updateClientAction', () => {
    it('throws when not authenticated', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } })
      await expect(
        updateClientAction('c1', { full_name: 'Ana', email: '', phone: '', company: '' })
      ).rejects.toThrow('Não autenticado')
    })

    it('throws when not org member', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
      resolveOrgMember.mockResolvedValue(null)
      await expect(
        updateClientAction('c1', { full_name: 'Ana', email: '', phone: '', company: '' })
      ).rejects.toThrow('Não autorizado')
    })

    it('throws when client not owned by org', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
      resolveOrgMember.mockResolvedValue({ organization_id: 'org-1' })
      // assertClientOwnership query returns no data
      fromResults = [{ data: null, error: null }]
      await expect(
        updateClientAction('c1', { full_name: 'Ana', email: '', phone: '', company: '' })
      ).rejects.toThrow('Cliente não encontrado')
    })

    it('updates client when valid', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
      resolveOrgMember.mockResolvedValue({ organization_id: 'org-1' })
      fromResults = [
        { data: { id: 'c1' }, error: null },  // assertClientOwnership
        { data: null, error: null },            // update
      ]
      await expect(
        updateClientAction('c1', { full_name: 'Ana Costa', email: 'ana@example.com', phone: '', company: '' })
      ).resolves.toBeUndefined()
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ full_name: 'Ana Costa' }))
    })

    it('throws when full_name is empty', async () => {
      await expect(
        updateClientAction('c1', { full_name: '  ', email: '', phone: '', company: '' })
      ).rejects.toThrow('Nome obrigatório')
    })
  })

  describe('deactivateClientAction', () => {
    it('sets is_active false on owned client', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
      resolveOrgMember.mockResolvedValue({ organization_id: 'org-1' })
      fromResults = [
        { data: { id: 'c1' }, error: null },
        { data: null, error: null },
      ]
      await deactivateClientAction('c1')
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false })
    })
  })

  describe('loadClientsAction', () => {
    it('returns clients array', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
      resolveOrgMember.mockResolvedValue({ organization_id: 'org-1' })
      fromResults = [{ data: [{ id: 'c1', full_name: 'Ana' }], error: null }]
      const result = await loadClientsAction()
      expect(result).toEqual([{ id: 'c1', full_name: 'Ana' }])
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail (module not found is OK)**

```bash
npx vitest run __tests__/clients-actions.test.ts
```
Expected: tests fail (imports resolve, but assertions fail until implementation is confirmed correct).

- [ ] **Step 3: Run tests to verify they pass**

```bash
npx vitest run __tests__/clients-actions.test.ts
```
Expected: all tests pass (the actions already exist from previous session).

- [ ] **Step 4: Commit**

```bash
git add __tests__/clients-actions.test.ts
git commit -m "test: add coverage for clients actions"
```

---

### Task 6: Tests for `templates/actions.ts`

**Files:**
- Create: `__tests__/templates-actions.test.ts`

- [ ] **Step 1: Write the tests**

Create `__tests__/templates-actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInsert = vi.fn()
const mockUpdate = vi.fn()

function makeQuery(result: unknown) {
  const q: Record<string, unknown> = {}
  q.then = (res: (v: unknown) => void) => Promise.resolve(result).then(res)
  q.catch = (rej: (e: unknown) => void) => Promise.resolve(result).catch(rej)
  const chain = () => makeQuery(result)
  q.select = vi.fn(chain)
  q.eq = vi.fn(chain)
  q.single = vi.fn(chain)
  q.order = vi.fn(chain)
  q.insert = vi.fn((...args: unknown[]) => { mockInsert(...args); return makeQuery(result) })
  q.update = vi.fn((...args: unknown[]) => { mockUpdate(...args); return makeQuery(result) })
  return q
}

let fromResults: unknown[] = []
const supabaseMock = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => {
    const result = fromResults.shift() ?? { data: null, error: null }
    return makeQuery(result)
  }),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(supabaseMock),
}))
vi.mock('@/lib/supabase/actions', () => ({
  resolveOrgMember: vi.fn(),
}))

describe('templates actions', () => {
  let resolveOrgMember: ReturnType<typeof vi.fn>
  let loadMessageTemplatesAction: () => Promise<unknown[]>
  let createMessageTemplateAction: (input: unknown) => Promise<void>
  let updateMessageTemplateAction: (id: string, input: unknown) => Promise<void>
  let deactivateMessageTemplateAction: (id: string) => Promise<void>

  const validInput = {
    name: 'Confirmação',
    channel: 'email' as const,
    language: 'pt' as const,
    subject: 'Olá',
    body_template: 'Olá {{client_name}}',
  }

  beforeEach(async () => {
    vi.resetModules()
    fromResults = []
    mockInsert.mockReset()
    mockUpdate.mockReset()
    supabaseMock.auth.getUser.mockReset()
    supabaseMock.from.mockClear()

    const mod = await import('@/app/dashboard/templates/actions')
    loadMessageTemplatesAction = mod.loadMessageTemplatesAction
    createMessageTemplateAction = mod.createMessageTemplateAction
    updateMessageTemplateAction = mod.updateMessageTemplateAction
    deactivateMessageTemplateAction = mod.deactivateMessageTemplateAction

    const helpers = await import('@/lib/supabase/actions')
    resolveOrgMember = helpers.resolveOrgMember as ReturnType<typeof vi.fn>
  })

  describe('createMessageTemplateAction', () => {
    it('throws on invalid input (empty name)', async () => {
      await expect(
        createMessageTemplateAction({ ...validInput, name: '' })
      ).rejects.toThrow()
    })

    it('throws when not authenticated', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } })
      await expect(createMessageTemplateAction(validInput)).rejects.toThrow('Não autenticado')
    })

    it('inserts template for org member', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
      resolveOrgMember.mockResolvedValue({ organization_id: 'org-1' })
      fromResults = [{ data: null, error: null }]
      await createMessageTemplateAction(validInput)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Confirmação', organization_id: 'org-1' })
      )
    })
  })

  describe('updateMessageTemplateAction', () => {
    it('throws when template not owned', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
      resolveOrgMember.mockResolvedValue({ organization_id: 'org-1' })
      fromResults = [{ data: null, error: null }] // ownership check fails
      await expect(updateMessageTemplateAction('t1', validInput)).rejects.toThrow('Template não encontrado')
    })

    it('updates template when owned', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
      resolveOrgMember.mockResolvedValue({ organization_id: 'org-1' })
      fromResults = [
        { data: { id: 't1' }, error: null }, // ownership check passes
        { data: null, error: null },           // update
      ]
      await updateMessageTemplateAction('t1', validInput)
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Confirmação' }))
    })
  })

  describe('deactivateMessageTemplateAction', () => {
    it('sets is_active false', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
      resolveOrgMember.mockResolvedValue({ organization_id: 'org-1' })
      fromResults = [
        { data: { id: 't1' }, error: null },
        { data: null, error: null },
      ]
      await deactivateMessageTemplateAction('t1')
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false })
    })
  })

  describe('loadMessageTemplatesAction', () => {
    it('returns templates', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
      resolveOrgMember.mockResolvedValue({ organization_id: 'org-1' })
      fromResults = [{ data: [{ id: 't1', name: 'Confirmação' }], error: null }]
      const result = await loadMessageTemplatesAction()
      expect(result).toEqual([{ id: 't1', name: 'Confirmação' }])
    })
  })
})
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run __tests__/templates-actions.test.ts
```
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add __tests__/templates-actions.test.ts
git commit -m "test: add coverage for templates actions"
```

---

### Task 7: Tests for `sendPortalLinkAction`

**Files:**
- Create: `__tests__/send-portal-link.test.ts`

- [ ] **Step 1: Write the tests**

Create `__tests__/send-portal-link.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSendEmail = vi.fn().mockResolvedValue('msg-1')
const mockBuildEmailHtml = vi.fn().mockReturnValue('<html/>')

vi.mock('@/lib/notifications/channels/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  buildEmailHtml: (...args: unknown[]) => mockBuildEmailHtml(...args),
}))
vi.mock('@/lib/supabase/actions', () => ({
  resolveOrgMember: vi.fn(),
}))

function makeQuery(result: unknown) {
  const q: Record<string, unknown> = {}
  q.then = (res: (v: unknown) => void) => Promise.resolve(result).then(res)
  q.catch = (rej: (e: unknown) => void) => Promise.resolve(result).catch(rej)
  const chain = () => makeQuery(result)
  q.select = vi.fn(chain)
  q.eq = vi.fn(chain)
  q.single = vi.fn(chain)
  return q
}

let fromResults: unknown[] = []
const supabaseMock = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => {
    const result = fromResults.shift() ?? { data: null, error: null }
    return makeQuery(result)
  }),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(supabaseMock),
}))

const PORTAL_URL = 'https://app.example.com'

describe('sendPortalLinkAction', () => {
  let resolveOrgMember: ReturnType<typeof vi.fn>
  let sendPortalLinkAction: (eventId: string) => Promise<void>

  beforeEach(async () => {
    vi.resetModules()
    fromResults = []
    mockSendEmail.mockReset()
    mockSendEmail.mockResolvedValue('msg-1')
    supabaseMock.auth.getUser.mockReset()
    supabaseMock.from.mockClear()
    process.env.NEXT_PUBLIC_APP_URL = PORTAL_URL

    const mod = await import('@/app/dashboard/events/[eventId]/actions')
    sendPortalLinkAction = mod.sendPortalLinkAction

    const helpers = await import('@/lib/supabase/actions')
    resolveOrgMember = helpers.resolveOrgMember as ReturnType<typeof vi.fn>
  })

  it('throws when not authenticated', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } })
    await expect(sendPortalLinkAction('e1')).rejects.toThrow('Não autenticado')
  })

  it('throws when event not found', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue({ organization_id: 'org-1' })
    fromResults = [{ data: null, error: null }] // event not found
    await expect(sendPortalLinkAction('e1')).rejects.toThrow('Evento não encontrado')
  })

  it('throws when no clients with email', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue({ organization_id: 'org-1' })
    fromResults = [
      { data: { id: 'e1', name: 'Concerto', portal_token: 'tok123', organization_id: 'org-1' }, error: null },
      { data: [{ notification_prefs: { channels: ['email'] }, opted_out: false, client: { full_name: 'Ana', email: null } }], error: null },
    ]
    await expect(sendPortalLinkAction('e1')).rejects.toThrow('Nenhum cliente com email')
  })

  it('sends email to eligible clients', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue({ organization_id: 'org-1' })
    fromResults = [
      { data: { id: 'e1', name: 'Concerto', portal_token: 'tok123', organization_id: 'org-1' }, error: null },
      {
        data: [
          { notification_prefs: { channels: ['email'] }, opted_out: false, client: { full_name: 'Ana', email: 'ana@example.com' } },
        ],
        error: null,
      },
    ]
    await sendPortalLinkAction('e1')
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ana@example.com',
        subject: expect.stringContaining('Concerto'),
      })
    )
  })

  it('throws when NEXT_PUBLIC_APP_URL missing', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.NEXT_PUBLIC_PORTAL_URL
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue({ organization_id: 'org-1' })
    fromResults = [
      { data: { id: 'e1', name: 'Concerto', portal_token: 'tok123', organization_id: 'org-1' }, error: null },
    ]
    await expect(sendPortalLinkAction('e1')).rejects.toThrow('NEXT_PUBLIC_APP_URL')
  })
})
```

- [ ] **Step 2: Run tests (expect fail on portal URL test until Task 4 is done)**

```bash
npx vitest run __tests__/send-portal-link.test.ts
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add __tests__/send-portal-link.test.ts
git commit -m "test: add coverage for sendPortalLinkAction"
```

---

## Self-Review

**Spec coverage:**
1. Fix `as any` in notifications page → Task 1
2. Fix `any[]` in clients page → Task 2
3. Test coverage for clients/actions → Task 5
4. Test coverage for templates/actions → Task 6
5. Test coverage for sendPortalLinkAction → Task 7
6. Portal URL guard → Task 4
7. Extract `resolveOrgMember` → Task 3

All 6 cleanup items are covered. No placeholders. No TBDs.

**Task ordering note:** Task 3 (extract `resolveOrgMember`) must run before Tasks 5, 6, 7 (tests mock `@/lib/supabase/actions`). Task 4 (portal URL guard) must run before Task 7's env-missing test.

**Recommended execution order:** 1 → 2 → 3 → 4 → 5 → 6 → 7
