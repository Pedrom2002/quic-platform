# AI Features Design

## Goal

Add 5 AI-powered features to the event management platform using the Anthropic API (claude-haiku-4-5-20251001). All features are on-demand (user-triggered), never automatic.

## Shared Infrastructure

### Package
`@anthropic-ai/sdk` installed once, used by all 5 features.

### Auth pattern for AI Route Handlers
All AI routes live under `app/api/ai/`. Each verifies the Supabase session via `createClient()` + `supabase.auth.getUser()`, resolves `organization_id` via `team_members`, then calls Anthropic. No unauthenticated AI calls allowed.

### Environment variable
`ANTHROPIC_API_KEY` — added to `.env.local` and Vercel project settings.

### Model
`claude-haiku-4-5-20251001` for all features (fast, cheap, sufficient for structured list generation and short analysis).

---

## Feature 1: Generate Tasks from Event Description

### Trigger
Button "Gerar com IA" in the header of `components/events/TaskTree.tsx` (tree view only).

### Flow
1. Button opens a modal (`GenerateTasksModal`).
2. Modal form fields:
   - **Tipo de evento** — dropdown: Festival de Música, Conferência, Casamento, Evento Corporativo, Concerto, Desfile, Outro (free text)
   - **Número de pessoas** — number input
   - **Data do evento** — date input
   - **Notas adicionais** — textarea (optional, max 500 chars)
3. Submit calls `POST /api/ai/generate-tasks` with `{ eventId, eventType, guestCount, eventDate, notes }`.
4. Route Handler streams response. Modal switches to preview mode.
5. Preview: tasks appear as they stream, rendered as a collapsible tree (root tasks + indented sub-tasks). Loading skeleton shown until first chunk arrives.
6. Footer: "Inserir X tarefas" button (disabled while streaming). Clicking calls `createTaskAction` for each root task + sub-tasks in order, then closes modal.
7. Cancel discards without inserting.

### API: `POST /api/ai/generate-tasks/route.ts`
- Auth check (Supabase session + org member).
- Validate `eventId` belongs to org.
- Call Anthropic with streaming. Prompt asks for JSON array:
  ```
  [
    { "title": "...", "subtasks": [{ "title": "..." }, ...] },
    ...
  ]
  ```
- Stream raw text chunks as `text/event-stream`. Client accumulates and parses JSON when stream ends.
- Max 50 root tasks, max 10 subtasks per root task (enforced in prompt).

### Components
- `components/events/GenerateTasksModal.tsx` — modal with form + preview states
- Modify `components/events/TaskTree.tsx` — add button + modal render

---

## Feature 2: Event Summary

### Trigger
Button "Resumo IA" on `app/dashboard/events/[eventId]/page.tsx` (event detail page), near existing quick-link cards.

### Flow
1. Button opens modal (`EventSummaryModal`).
2. Modal shows loading state, immediately calls `POST /api/ai/event-summary`.
3. Route streams summary text. Modal renders markdown-like output (whitespace-pre-wrap, no full markdown parser needed).
4. Summary covers: event name/date/status, checklist progress (X/Y items done), overdue items, task progress, open notes count, recent activity. IA synthesises into 3-5 paragraphs.
5. "Fechar" button only — summary is read-only.

### API: `POST /api/ai/event-summary/route.ts`
- Auth check.
- Fetch from DB: event row, checklist items (with status), event_tasks (flat, with status + due_at + assigned_to), event_notes (last 10), team assignments.
- Build context string, call Anthropic with streaming.
- Stream `text/event-stream`.

### Components
- `components/events/EventSummaryModal.tsx` — modal with streaming text display
- Modify `app/dashboard/events/[eventId]/page.tsx` — add button

---

## Feature 3: Assignee Suggestion

### Trigger
Inside `components/events/TaskSidePanel.tsx`, when `assigned_to` is null: a small chip "✨ Sugerir responsável" below the assignee dropdown.

### Flow
1. Click chip calls `POST /api/ai/suggest-assignee` (non-streaming, fast response).
2. While loading: chip shows spinner.
3. Response: `{ memberId: string, memberName: string, reason: string }` or `null`.
4. If suggestion: chip becomes "João Silva — aceitar?" with Accept + Dismiss buttons.
5. Accept: sets assignee (calls `updateTaskAction`), chip disappears.
6. Dismiss: chip returns to "✨ Sugerir responsável".
7. Shown only when `assigned_to === null` and org has >1 member.

### API: `POST /api/ai/suggest-assignee/route.ts`
- Auth check.
- Fetch: task title + description, all org team members (id, full_name, role), last 20 completed tasks across all events with their `assigned_to` (to find patterns).
- Call Anthropic (no streaming — short response). Prompt: "Given this task and team history, which member is best suited? Return JSON `{ memberId, reason }` or `null`."
- Validate returned `memberId` is in org members list before returning.

### Components
- Modify `components/events/TaskSidePanel.tsx` — add suggestion chip below assignee dropdown

---

## Feature 4: Auto-Description + Sub-task Suggestions

### Trigger
Button "✨ Gerar descrição" inside `components/events/TaskSidePanel.tsx`, below the description textarea (always visible).

### Flow
1. Click calls `POST /api/ai/describe-task` (streaming).
2. While streaming: description textarea fills with text as it arrives (disabled during stream).
3. After description streams: a separate section "Sub-tarefas sugeridas" appears with a list of 3-5 suggested sub-task titles, each with a checkbox (checked by default).
4. Button "Criar sub-tarefas selecionadas" inserts checked items via `createTaskAction` with `parentId = task.id`.
5. If task already has a description, button label becomes "Regenerar descrição".

### API: `POST /api/ai/describe-task/route.ts`
- Auth check.
- Input: `{ taskId, eventId }`. Fetch task title, existing description, event name, parent task title (if any).
- Stream response in two parts, separated by a sentinel `\n---SUBTASKS---\n`:
  - Part 1: description text (streamed)
  - Part 2: JSON array of sub-task title strings (streamed after sentinel)
- Client splits on sentinel to separate description from sub-tasks.

### Components
- Modify `components/events/TaskSidePanel.tsx` — add button + sub-task suggestion section

---

## Feature 5: Risk Analysis

### Trigger
Button "Analisar Risco" on `app/dashboard/events/[eventId]/page.tsx` (near "Resumo IA" button).

### Flow
1. Button opens `RiskAnalysisModal`.
2. Modal immediately calls `POST /api/ai/risk-analysis`.
3. Streams analysis. Output is structured:
   - **Nível de risco**: Verde / Amarelo / Vermelho (coloured badge)
   - **Fatores de risco**: bullet list
   - **Recomendações**: bullet list
4. Client parses a leading JSON header `{ "level": "green"|"yellow"|"red" }` then streams the rest as prose, or uses a sentinel pattern similar to Feature 4.
5. "Fechar" button only.

### API: `POST /api/ai/risk-analysis/route.ts`
- Auth check.
- Fetch: event (name, date, status), all tasks (status, due_at), all checklist items (status, due_at), team assignments count, event_notes count.
- Compute pre-analysis stats server-side: overdue task count, % completed tasks, days until event, unassigned task count.
- Pass stats + raw data to Anthropic. Prompt requests structured output:
  ```
  LEVEL: red|yellow|green
  ---
  [prose analysis with risk factors and recommendations]
  ```
- Stream response. Client reads first line for level, rest for prose.

### Components
- `components/events/RiskAnalysisModal.tsx` — modal with coloured badge + streaming prose
- Modify `app/dashboard/events/[eventId]/page.tsx` — add button

---

## File Map

| Action | File |
|---|---|
| Create | `app/api/ai/generate-tasks/route.ts` |
| Create | `app/api/ai/event-summary/route.ts` |
| Create | `app/api/ai/suggest-assignee/route.ts` |
| Create | `app/api/ai/describe-task/route.ts` |
| Create | `app/api/ai/risk-analysis/route.ts` |
| Create | `components/events/GenerateTasksModal.tsx` |
| Create | `components/events/EventSummaryModal.tsx` |
| Create | `components/events/RiskAnalysisModal.tsx` |
| Modify | `components/events/TaskTree.tsx` |
| Modify | `components/events/TaskSidePanel.tsx` |
| Modify | `app/dashboard/events/[eventId]/page.tsx` |

---

## Shared Behaviour

- All AI calls require authenticated Supabase session. No public AI endpoints.
- All modals close on Escape key.
- All streaming responses use `text/event-stream` content type via `ReadableStream` in Next.js Route Handler.
- Errors: if Anthropic call fails, show "Erro ao gerar. Tenta novamente." inside the modal. No crash.
- `ANTHROPIC_API_KEY` must be set in environment. If missing, route returns 500 with clear message.
- Portal users never see any AI features (AI features are internal dashboard only).
