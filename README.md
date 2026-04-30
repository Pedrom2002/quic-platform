# Quic Platform

Plataforma multi-tenant de gestão de eventos e comunicação automatizada com clientes.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router) + React 19 |
| Base de dados | Supabase (PostgreSQL + RLS + Realtime) |
| Autenticação | Supabase Auth (email/password) |
| Email | Brevo (API REST) |
| Queue | Upstash QStash (serverless) |
| Cron | Vercel Cron |
| UI | shadcn/ui + Tailwind CSS v4 |
| Validação | Zod |

---

## Setup Local

### 1. Instalar dependências

```bash
npm install
```

### 2. Variáveis de ambiente

Copia `.env.example` para `.env.local` e preenche todos os valores:

```bash
cp .env.example .env.local
```

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Chave pública anon do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Chave service role (apenas server-side) |
| `BREVO_API_KEY` | Sim | API key do Brevo para envio de emails |
| `EMAIL_FROM` | Sim | Remetente de email: `Nome <email@dominio.com>` |
| `RESEND_WEBHOOK_SECRET` | Sim | Secret para verificação HMAC dos webhooks Brevo |
| `QSTASH_TOKEN` | Prod | Token Upstash QStash (ausente → modo direto em dev) |
| `QSTASH_CURRENT_SIGNING_KEY` | Prod | Chave de verificação de assinatura QStash |
| `QSTASH_NEXT_SIGNING_KEY` | Prod | Chave de rotação QStash |
| `CRON_SECRET` | Sim | Bearer token para autenticar o cron job |
| `PORTAL_JWT_SECRET` | Sim | Secret HS256 para assinar tokens de portal de clientes |
| `NEXT_PUBLIC_APP_URL` | Sim | URL base da app (ex: `https://app.quic.pt`) |
| `NEXT_PUBLIC_PORTAL_URL` | Não | URL base do portal (usa APP_URL se omitido) |

### 3. Iniciar servidor de desenvolvimento

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
| `npm run db:types` | Regenerar tipos TypeScript do schema Supabase |

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

### Cron (`/api/cron/process-scheduled`)

Corre a cada hora via Vercel Cron. Processa jobs `queued` sem `qstash_message_id` que já passaram o `scheduled_at`. Usa update atómico para `processing` como guarda de idempotência antes de publicar no QStash.

### Portal de cliente (`/portal/[token]`)

Acesso público via JWT HS256 com expiração de 90 dias. Mostra apenas itens `is_client_visible = true`. Atualiza em tempo real via Supabase Realtime.

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
  notifications/     Dispatcher, template renderer, canais (email)
  portal/            JWT sign/verify
  qstash/            Verificação de assinatura
  supabase/          Clientes browser / server / admin
schemas/             Validação Zod (eventos, checklist)
types/               DTOs da app + tipos gerados pelo Supabase
__tests__/           Testes unitários Vitest
```

---

## Testes

```bash
npm test              # correr todos os testes
npm test -- --watch   # modo watch
```

Cobertura atual: `lib/notifications/template-renderer`, `lib/notifications/channels/email`, `lib/portal/token`, `lib/event-status`.

---

## Segurança

- RLS activo no Supabase — o cliente anon só acede a dados da própria organização
- Service role key usada apenas em route handlers e workers (nunca exposta ao cliente)
- Tokens de portal verificados com `jose` (HS256)
- Assinaturas QStash verificadas com `@upstash/qstash` Receiver
- Webhooks Brevo verificados com HMAC-SHA256
- Authorization checks a nível de aplicação nas API routes (verificação de `organization_id`)
