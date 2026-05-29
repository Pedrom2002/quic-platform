# Quic Platform

Plataforma multi-tenant de gestão de eventos e comunicação automatizada com clientes.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router) + React 19 |
| Base de dados | Supabase (PostgreSQL + RLS) |
| Autenticação | Supabase Auth (email/password) |
| Email | Brevo (API REST) |
| Ficheiros | Vercel Blob |
| Queue | Upstash QStash (serverless) |
| Cron | Vercel Cron |
| AI | Google Gemini |
| UI | shadcn/ui + Tailwind CSS v4 |
| Validação | Zod |
| Testes | Vitest (unit, ~86% em `lib`/`app/api`/`schemas`) + Playwright (e2e) |

---

## Setup Local

```bash
bash setup.sh
```

O script verifica a versão do Node, copia `.env.example` para `.env.local`, instala dependências e corre o typecheck.

Edita `.env.local` com as tuas credenciais (ver `.env.example` para descrição de cada variável).

### Variáveis obrigatórias

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública anon do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (apenas server-side) |
| `CRON_SECRET` | Bearer token para o cron job (mín. 32 chars, `openssl rand -hex 32`) |
| `NEXT_PUBLIC_APP_URL` | URL base da app (ex: `https://app.quic.pt`) |
| `BLOB_READ_WRITE_TOKEN` | Token Vercel Blob |

Todas as outras variáveis são opcionais com degradação graciosa (ver `.env.example`).

### Iniciar servidor de desenvolvimento

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

---

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Iniciar build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificação de tipos TypeScript |
| `npm test` | Correr testes unitários (Vitest) |
| `npm run db:types` | Regenerar tipos TypeScript do schema Supabase (requer `SUPABASE_PROJECT_ID` em `.env.local`) |
| `node scripts/seed-demo.mjs` | Popular base de dados com dados de demonstração |

---

## Arquitetura

### Padrões principais

- **Server Components por defeito** — páginas fazem queries diretas ao Supabase sem passar por API routes
- **Server Actions** para mutações (criar/editar eventos, guardar drafts)
- **API Routes** apenas para: webhooks externos, workers QStash, cron
- **Client Components** apenas onde há interatividade (forms, real-time, modais)

### Fluxo de notificações

```
Utilizador marca checklist item como "concluído"
    │
    ▼
PATCH /api/events/[eventId]/checklist-items/[itemId]
    │  Verifica auth + ownership da organização
    │  Atualiza status + completed_at
    │
    ▼ (fire-and-forget com log de erros)
dispatchNotificationsForItem()
    │  Lê regras do item (notification_rules JSONB)
    │  Filtra clientes por audience (all / vip / primary_contact)
    │  Faz batch lookup de message_templates por (channel, language)
    │  Insere notification_jobs em batch
    │
    ├─ Com QSTASH_TOKEN (produção)
    │       Publica jobs no QStash com delay opcional
    │       QStash chama POST /api/workers/send-notification
    │       Worker verifica assinatura HMAC
    │       Envia email via Brevo
    │       Atualiza job status → delivered
    │
    └─ Sem QSTASH_TOKEN (desenvolvimento)
            Envia email diretamente via Brevo
            Atualiza job status → delivered

Brevo → POST /api/webhooks/resend (delivery events)
    Verifica assinatura HMAC
    Regista evento em notification_log
```

### Crons (Vercel Cron — ver `vercel.json`)

Todos os crons são invocados por GET com `Authorization: Bearer ${CRON_SECRET}`, validado em tempo constante (`lib/cron-auth.ts`).

| Path | Schedule | Função |
|------|----------|--------|
| `/api/cron/process-scheduled` | `0 * * * *` (de hora a hora) | Envia notificações agendadas |
| `/api/cron/marketing-followup` | `0 9 * * *` (diário) | Dispara follow-ups de campanhas |
| `/api/marketing/bounce-poll` | `0 */6 * * *` (de 6 em 6 h) | Faz polling IMAP de bounces |

> Schedules abaixo de "diário" requerem o plano **Vercel Pro**. No plano Hobby, ajustar para `@daily`.

`process-scheduled` reclama os jobs `queued` (passado o `scheduled_at`) através da função SQL `claim_notification_jobs`, que usa `FOR UPDATE SKIP LOCKED` — garante que execuções concorrentes nunca processam o mesmo job (sem envios duplicados).

### Portal de cliente (`/portal/[token]`)

Acesso público via token URL-safe (12 bytes aleatórios, **não** JWT) armazenado em `events.portal_token`. Mostra apenas itens `is_client_visible = true`. Revogação via `events.portal_token_expires_at`.

---

## Estrutura de pastas

```
app/
  api/               Route handlers (webhooks, workers, cron)
  auth/              Login + OAuth callback
  dashboard/         Área autenticada (eventos, clientes, templates)
  portal/[token]/    Portal público do cliente
components/
  events/            ChecklistBoard
  ui/                Componentes shadcn/ui
lib/
  notifications/     Dispatcher, template renderer, canais (email/sms)
  marketing/         SMTP, IMAP, render/tracking, scoring, crypto
  portal/            Geração de token aleatório + leitura de dados do portal
  qstash/            Verificação de assinatura
  cron-auth.ts       Validação constant-time do CRON_SECRET
  supabase/          Clientes browser / server / admin
schemas/             Validação Zod (eventos, checklist, ficheiros, etc.)
types/               DTOs da app + tipos gerados pelo Supabase
__tests__/           Testes unitários Vitest
e2e/                 Testes end-to-end Playwright
```

---

## Testes

```bash
npm test               # unit tests (Vitest)
npm run test:coverage  # com relatório de cobertura
npm run test:watch     # modo watch
```

A cobertura é medida sobre `lib/`, `app/api/` e `schemas/` **e** sobre as Server Actions em `app/dashboard/**/actions.ts`, com thresholds mínimos definidos em `vitest.config.ts` (linhas 80%, funções 80%, branches 70%). O CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) corre lint, typecheck, testes com cobertura e `npm audit`.

---

## Segurança

- RLS activo no Supabase — o cliente anon só acede a dados da própria organização
- Service role key usada apenas em route handlers e workers (nunca exposta ao cliente)
- Tokens de portal: 12 bytes aleatórios → 16 chars base64url, armazenados em `events.portal_token`
- Assinaturas QStash verificadas com `@upstash/qstash` Receiver
- Webhooks Brevo verificados com HMAC-SHA256
- Authorization checks a nível de aplicação nas API routes (verificação de `organization_id`)
