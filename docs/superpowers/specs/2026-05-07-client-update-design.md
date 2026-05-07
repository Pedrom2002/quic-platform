# Client Update AI Design

## Goal

Allow staff to generate a client-friendly event status update via AI, review/edit it, then send it by email to all event clients.

## Trigger

Button "Atualizar Cliente" added to `components/events/AIButtons.tsx`, alongside the existing "Resumo IA" and "Analisar Risco" buttons. Uses a `MessageSquare` icon with green styling.

## Flow

1. Staff clicks "Atualizar Cliente" on the event detail page.
2. `ClientUpdateModal` opens.
3. Modal shows a dropdown "Foco da mensagem" with options:
   - Update geral de progresso
   - Confirmação de detalhes do evento
   - Aviso de prazo / item pendente
   - Mensagem de boas-vindas
4. Staff selects a focus and clicks "Gerar".
5. Modal calls `POST /api/ai/client-update` with `{ eventId, focus }`.
6. Response streams into an editable `<textarea>`. Textarea is disabled during streaming, enabled after.
7. Below the textarea: "Enviar a X clientes" — shows count of clients with email configured. Disabled while streaming.
8. Staff reviews/edits text, clicks "Enviar a X clientes".
9. Calls server action `sendClientUpdateAction(eventId, text)`.
10. Action sends email via Brevo to all eligible clients. Returns `{ sent: number }`.
11. Modal shows success toast and closes.
12. Cancel at any point discards without sending.

## API: `POST /api/ai/client-update/route.ts`

- Auth: Supabase session + `team_members` lookup → `organization_id`. 401/403 if not authenticated.
- Validate `eventId` belongs to org → 404.
- Guard: `ANTHROPIC_API_KEY` missing → 500.
- Input: `{ eventId: string, focus: string }`
- Fetch from DB:
  - Event: `name`, `start_datetime`, `status`, `venue_name`
  - Checklist: count completed / total (`event_checklist_items`)
  - Overdue checklist items count (due_at < now, status not completed/skipped)
- Build context string, call Anthropic with streaming, model `claude-haiku-4-5-20251001`.
- Prompt instructions:
  - Write in Portuguese (European), professional but warm tone
  - 2-3 paragraphs, no bullet points
  - Address the client directly ("O seu evento...")
  - Focus determined by the `focus` field
  - Do NOT invent details not in the context
- Stream `text/event-stream`.

## Server Action: `sendClientUpdateAction`

Location: `app/dashboard/events/[eventId]/actions.ts` (add to existing file).

```typescript
sendClientUpdateAction(eventId: string, text: string): Promise<{ sent: number }>
```

- Auth: same pattern as `sendPortalLinkAction` (createClient + resolveOrgMember + event ownership check)
- Fetch `event_clients` with `clients(full_name, email)` where `opted_out = false`
- Filter: `notification_prefs.channels` includes 'email' (same logic as `sendPortalLinkAction`)
- Send via `sendEmail` + `buildEmailHtml` for each recipient
- Subject: `"Atualização do evento: {event.name}"`
- Returns `{ sent: number }`
- Throws if no recipients or all sends fail (same error pattern as `sendPortalLinkAction`)

## Components

### `components/events/ClientUpdateModal.tsx`

- `'use client'`
- Props: `{ eventId: string; clientCount: number; onClose: () => void }`
- State: `focus` (string), `text` (string), `streaming` (bool), `sending` (bool), `error` (string | null)
- Escape closes modal
- Backdrop click closes modal
- Error shown inside modal as red text: "Erro ao gerar. Tenta novamente."
- Send error shown inline

### `components/events/AIButtons.tsx`

- Add `showUpdate` state and "Atualizar Cliente" button
- Pass `clientCount` prop to `AIButtons` (fetched in the server component page)
- Dynamic import `ClientUpdateModal`

### `app/dashboard/events/[eventId]/page.tsx`

- Add `clientCount` query (already exists: `clientCount` from `event_clients`)
- Pass `clientCount` to `<AIButtons>`

## File Map

| Action | File |
|---|---|
| Create | `app/api/ai/client-update/route.ts` |
| Create | `components/events/ClientUpdateModal.tsx` |
| Modify | `app/dashboard/events/[eventId]/actions.ts` |
| Modify | `components/events/AIButtons.tsx` |
| Modify | `app/dashboard/events/[eventId]/page.tsx` |

## Shared Behaviour

- Auth required on all AI routes. No public endpoints.
- Escape closes modal.
- Streaming via `ReadableStream` / `text/event-stream`.
- Error: "Erro ao gerar. Tenta novamente." inside modal on Anthropic failure.
- `ANTHROPIC_API_KEY` guard: route returns 500 with clear message.
- Portal users never see AI features (internal dashboard only).
