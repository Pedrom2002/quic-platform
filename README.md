# Quic Platform

Plataforma multi-tenant de gestão de eventos e comunicação automatizada com clientes.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router) + React 19 |
| Base de dados | Supabase (PostgreSQL + RLS) |
| Autenticação | Supabase Auth (email/password) |
| Email transacional | Brevo (API REST), webhooks de entrega via Resend |
| Email marketing | Nodemailer SMTP + IMAP |
| Pagamentos | Stripe (checkout + webhooks) |
| Ficheiros | Vercel Blob |
| Queue | Upstash QStash (serverless) |
| Cron | Vercel Cron |
| AI | Google Gemini |
| UI | shadcn/ui + Tailwind CSS v4 |
| Validação | Zod |
| Testes | Vitest (unit, thresholds por área — ver secção Testes) + Playwright (e2e) |
| App mobile | Expo / React Native (staff: check-in QR, catálogo, portal) |

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
| `CRON_SECRET` | Bearer token para os cron jobs (mín. 32 chars, `openssl rand -hex 32`) |
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

## Funcionalidades

### Gestão de eventos

- Criação e edição de eventos com estado (draft, active, archived)
- Checklist de tarefas por evento com atribuição a membros da equipa
- Gestão de clientes por evento (VIP, contacto principal, audiência)
- Portal público por evento (`/portal/[token]`) com acesso via token URL-safe
- Upload e partilha de ficheiros por evento
- Relatórios de evento visíveis no dashboard e no portal do cliente
- Clipping de imprensa por evento
- Sorteios
- AI integrada: resumo automático, geração de tarefas, análise de risco, sugestão de responsável, atualização de cliente

### Notificações

Envio automatizado de email/SMS a clientes quando itens do checklist são marcados como concluídos. Suporta templates multilingue com variáveis, agendamento por delay, e filtro de audiência (all / vip / primary_contact).

### Marketing (bulk email)

Sistema completo de campanhas de email com:

- **Listas e contactos**: importação via CSV, entrada manual, deduplicação automática
- **Campanhas**: editor com variáveis de template (`{{nome}}`, `{{empresa}}`, `{{cargo}}`), subject e body
- **Envio via QStash**: cada email passa por `/api/marketing/send` com fila serverless
- **SMTP warmup**: limite de envios diários por remetente, aumenta automaticamente com o tempo (`marketing_sender_warmup`)
- **Tracking**: open tracking (pixel), click tracking (redirect), registo em `marketing_sends`
- **Retry automático**: cron diário reprocessa envios falhados das últimas 24h (`/api/cron/marketing-retry`)
- **Follow-up**: reenvio automatizado para quem não abriu ao fim de N dias
- **Bounce e reply**: polling IMAP para detetar bounces e respostas, bot filtering com multi-pixel forensics
- **Heatmap de engajamento**: visualização horária de opens/clicks
- **DNS check**: valida SPF/DKIM/DMARC antes de enviar
- **Unsubscribe**: header `List-Unsubscribe` + landing page (`/api/marketing/unsubscribe`)
- **AI insights**: análise de desempenho de campanha via Gemini (`/api/ai/marketing-insights`)
- **Geração de email com AI**: sugestão de corpo de email via Gemini (`/api/ai/generate-marketing-email`)

### Cards

Cartões de membro públicos com URL própria (`/[slug]`) e QR code. OG tags para link previews. Geridos em `/dashboard/cards`.

### Contactos

Base de contactos global da organização com importação CSV e vista tabular.

### Guia de cliente

Página pública de boas-vindas para clientes (`/guia-cliente`).

### Gestão de stock/inventário

Catálogo de materiais (`/rentals`, público) e área de gestão (`/dashboard/stock`, autenticada, `role IN ('admin','manager')`) para o inventário de equipamento de produção de eventos: categorias, materiais (com foto e disponibilidade), eventos (saídas/devoluções de material), ledger de movimentos, e pedidos de orçamento submetidos pelo catálogo público.

Migrado de um repositório standalone anterior (Stock-Plat) em 3 sub-projetos: migração de auth/RLS, catálogo público, área admin. Todas as tabelas usam o prefixo `stock_` (ver secção "Base de dados partilhada" abaixo).

### Bilhetes (checkout Stripe)

Venda de bilhetes por evento (`/dashboard/events/[eventId]/tickets`), com tipos de bilhete configuráveis (nome, preço, quantidade). Checkout público via Stripe (`POST /api/tickets/checkout`), confirmação de pagamento por webhook (`POST /api/webhooks/stripe`, assinatura verificada com `stripe.webhooks.constructEvent`, idempotente). Cada bilhete gera um QR code único (`qr_code`), validado à entrada do evento pela função SQL `check_in_ticket` (RPC `SECURITY DEFINER`, scoped à organização do staff autenticado).

### Artistas agenciados

Gestão de artistas agenciados (`/dashboard/artists`) com portal privado por artista (`/artista/[token]`, acesso por token URL-safe, mesmo padrão do portal de eventos). Substitui o envio manual de emails com agenda, imprensa e ficheiros.

- **Agenda**: espetáculos, ensaios, entrevistas, viagens e gravações, com ligação opcional a um evento da plataforma e toggle de visibilidade no portal
- **Clipping**: artigos publicados sobre o artista (título, fonte, link, screenshot)
- **Conteúdos digitais**: fotos/artes por upload (Vercel Blob, validação de magic bytes) e vídeos grandes por link externo
- **Documentos**: contratos, riders, press kits e faturas
- **Notificação opcional**: email Brevo ao artista quando algo é publicado (checkbox por publicação, default configurável por artista)
- **Gestão do link**: copiar, regenerar, revogar e reativar o token; artista inativo fica sem acesso

Tabelas: `artists`, `artist_agenda_items`, `artist_clippings`, `artist_assets` (RLS por organização via `get_user_org_id()`; portal lê com service role após validar o token). Migração `0040_artists_init.sql`. Download de ficheiros do portal via `/api/artist-portal/download` com validação de token e ownership (anti open-proxy).

### App mobile (`mobile/`)

App companion em Expo/React Native (Expo Router, iOS + Android), autenticação própria via Supabase (email/password), usada por staff em produção de eventos:

- **Bilhetes**: consulta de bilhetes comprados e leitura de QR code na entrada (`expo-camera`) para check-in, chamando a mesma RPC `check_in_ticket` do backend
- **Catálogo de stock**: navegação pelo catálogo de materiais e submissão de pedidos de orçamento (espelha `/rentals` da web)
- **Eventos e artistas**: consulta de eventos e portal de artistas a partir do telemóvel
- **Notificações push**: registo de push token (`expo-notifications`), consumido por `/api/portal/push-token`

Scripts próprios em `mobile/package.json` (`npm start`, `npm run android`, `npm run ios`, `npm test`, `npm run typecheck`) — projeto Expo independente, não faz parte do build/deploy Next.js.

> **TODO antes do primeiro build de produção** (`mobile/app.json`):
> 1. Correr `eas init` para obter um project ID Expo real, depois adicionar `extra.eas.projectId` e `owner` a `mobile/app.json`, e substituir o placeholder `updates.url` (atualmente `https://u.expo.dev/PLACEHOLDER_PROJECT_ID`) pelo valor real.
> 2. Definir o valor real de `EXPO_PUBLIC_SENTRY_DSN` como EAS secret antes do primeiro build de produção (mesmo DSN do `SENTRY_DSN` do backend).

---

## Arquitetura

### Padrões principais

- **Server Components por defeito** — páginas fazem queries diretas ao Supabase sem passar por API routes
- **Server Actions** para mutações (criar/editar eventos, guardar drafts)
- **API Routes** apenas para: webhooks externos, workers QStash, cron, tracking
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

Resend → POST /api/webhooks/resend (delivery events)
    Verifica assinatura HMAC (svix, RESEND_WEBHOOK_SECRET)
    Faz match por provider_message_id + provider='brevo' em notification_log
    Regista evento em notification_log
```

### Fluxo de marketing

```
Dashboard cria campanha + lista de contactos
    │
    ▼
POST /api/marketing/send (QStash worker)
    │  Verifica SMTP warmup limit
    │  Renderiza template com variáveis do contacto
    │  Injeta open pixel + click tracking links
    │  Envia via Nodemailer SMTP
    │  Regista em marketing_sends
    │
    ├─ Open pixel   → GET /api/marketing/track/open
    ├─ Click link   → GET /api/marketing/track/click
    └─ Unsubscribe  → GET /api/marketing/unsubscribe

Crons diários:
    marketing-maintenance (07:00 UTC)
        Follow-up para quem não abriu
        Polling IMAP de bounces + respostas
    marketing-retry (09:00 UTC)
        Reprocessa envios falhados das últimas 24h
```

### Crons (Vercel Cron — ver `vercel.json`)

Todos os crons são invocados por GET com `Authorization: Bearer ${CRON_SECRET}`, validado em tempo constante (`lib/cron-auth.ts`).

| Path | Schedule | Função |
|------|----------|--------|
| `/api/cron/process-scheduled` | `0 6 * * *` | Envia notificações agendadas |
| `/api/cron/marketing-maintenance` | `0 7 * * *` | Follow-ups + polling IMAP de bounces/replies |
| `/api/cron/marketing-retry` | `0 9 * * *` | Reprocessa envios falhados das últimas 24h |

> O plano **Vercel Hobby** limita a **2 cron jobs, só diários**. Em **Pro** podes adicionar mais schedules. As rotas `/api/cron/marketing-followup` e `/api/marketing/bounce-poll` continuam a existir para invocação manual.

`process-scheduled` reclama os jobs `queued` (passado o `scheduled_at`) através da função SQL `claim_notification_jobs`, que usa `FOR UPDATE SKIP LOCKED` — garante que execuções concorrentes nunca processam o mesmo job.

### Portal de cliente (`/portal/[token]`)

Acesso público via token URL-safe (12 bytes aleatórios, não JWT) armazenado em `events.portal_token`. Mostra apenas itens `is_client_visible = true` e relatórios do evento. Revogação via `events.portal_token_expires_at`.

### Base de dados partilhada (stock)

O projeto Supabase é **partilhado** com um segundo produto de stock/inventário. Todas as tabelas/views/RPC desse domínio usam o prefixo `stock_` (`stock_categories`, `stock_materials`, `stock_material_units`, `stock_events`, `stock_movements`, `stock_quote_requests`, `stock_quote_request_items`, `stock_profiles`, view `stock_material_availability`, RPC `stock_submit_quote`), mais o bucket de storage `materials`. RLS gate via `is_stock_team()` (checa `team_members`, `role IN ('admin','manager')`, `is_active = true`) — não usa claim JWT.

`supabase db push` **não é utilizável** para este domínio (histórico de migrações partilhado entre dois repos originalmente separados). As migrações `0034`-`0037` em `supabase/migrations/` documentam o schema mas já foram aplicadas manualmente (SQL Editor / Management API) — não reaplicar.

Código consumidor: `app/rentals/*` (catálogo público), `app/dashboard/stock/*` (área admin), `lib/stock/*` (tipos, validação Zod, formatadores, mailto).

---

## Estrutura de pastas

```
app/
  [slug]/            Card público de membro
  artista/[token]/   Portal público do artista (acesso por token)
  guia-cliente/      Página de boas-vindas para clientes
  stock/             Catálogo público de materiais + pedido de orçamento
  api/
    ai/              Endpoints Gemini (resumo, tarefas, risco, insights, geração email)
    cron/            Cron handlers (process-scheduled, marketing-maintenance, marketing-retry)
    events/          Checklist items, ficheiros
    artist-portal/   Download de ficheiros do portal do artista
    marketing/       Send worker, tracking, bounce-poll, reply-poll, unsubscribe, importação
    portal/          Download de ficheiros do portal
    tickets/         Checkout Stripe de bilhetes
    webhooks/        Webhooks Resend (entrega de email) e Stripe (pagamentos)
    workers/         Worker QStash de notificações
  auth/              Login + OAuth callback
  dashboard/
    artists/         Gestão de artistas agenciados (perfil, agenda, clipping, conteúdos, documentos)
    cards/           Gestão de cartões de membro
    contacts/        Base de contactos
    events/          Lista, criação e detalhe de eventos
      [eventId]/     Checklist, clientes, clipping, ficheiros, notificações, relatórios, sorteios, tarefas, bilhetes, equipa
    files/           Ficheiros globais
    marketing/       Campanhas, contactos, settings SMTP
    settings/        Configurações da organização
    stock/           Área admin de stock: categorias, materiais, eventos, movimentos, pedidos
    team/            Membros da equipa
    templates/       Templates de notificação
  portal/[token]/    Portal público do cliente
components/
  events/            ChecklistBoard
  ui/                Componentes shadcn/ui
lib/
  ai/                Helpers Gemini + rate limiting
  artists/           Validação Zod, dados do portal, notificação e formatação do domínio de artistas
  contacts/          Importação e gestão de contactos
  marketing/         SMTP, IMAP, render/tracking, scoring, DNS check, crypto, maintenance
  notifications/     Dispatcher, template renderer, canais (email/sms)
  portal/            Geração de token + leitura de dados do portal
  qstash/            Verificação de assinatura
  stock/             Tipos, validação Zod, formatadores, mailto do domínio stock
  audit.ts           Registo de auditoria
  cron-auth.ts       Validação constant-time do CRON_SECRET
  csv-import.ts      Parser CSV para importação de contactos
  env.ts             Validação de variáveis de ambiente
  event-status.ts    Lógica de estado de evento
  logger.ts          Logger estruturado
  timeline.ts        Timeline de eventos
schemas/             Validação Zod (eventos, checklist, ficheiros, etc.)
types/               DTOs da app + tipos gerados pelo Supabase
__tests__/           Testes unitários Vitest
e2e/                 Testes end-to-end Playwright
scripts/             Scripts utilitários (seed, etc.)
```

---

## Testes

```bash
npm test               # unit tests (Vitest)
npm run test:coverage  # com relatório de cobertura
npm run test:watch     # modo watch
```

A cobertura é medida sobre `lib/`, `app/api/` e `schemas/` e sobre as Server Actions em `app/dashboard/**/actions.ts`, com thresholds *ratchet* por área definidos em `vitest.config.ts` (piso atual medido, nunca desce — ver comentário no próprio ficheiro). O CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) corre lint, typecheck, testes com cobertura e `npm audit`.

### App mobile

```bash
cd mobile
npm test        # Jest
npm run typecheck
```

> Nota: os ficheiros de teste da mobile (`mobile/lib/*.test.ts`, `mobile/__tests__/**`) têm gap de tipagem nos mocks Supabase (`jest.fn()` sem tipo genérico, ~120 erros `tsc` confinados a ficheiros `.test.ts(x)`) — o código de produção (`app/`, `lib/`, `hooks/`) não tem nenhum erro de tipo. Por corrigir.

---

## Segurança

- RLS activo no Supabase — o cliente anon só acede a dados da própria organização
- Service role key usada apenas em route handlers e workers (nunca exposta ao cliente)
- Tokens de portal: 12 bytes aleatórios → 16 chars base64url, armazenados em `events.portal_token`
- Assinaturas QStash verificadas com `@upstash/qstash` Receiver
- Webhooks Resend verificados com HMAC-SHA256 (svix)
- Webhooks Stripe verificados com `stripe.webhooks.constructEvent`
- Authorization checks a nível de aplicação nas API routes (verificação de `organization_id`)
- Isolamento de tenant verificado em testes e2e
