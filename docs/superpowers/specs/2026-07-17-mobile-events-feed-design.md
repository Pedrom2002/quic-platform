# App mobile Quic: feed de eventos públicos (fase 2)

## Contexto

Segunda de 4 fases planeadas para a app mobile Quic:

1. Setup base + auth (feito, mergeado em `master` em `e180c2c`)
2. **Feed de eventos público** (este spec)
3. Catálogo de produtos/stock
4. Portal do artista mobile (dados reais)

Esta fase substitui o placeholder da tab "Início" por uma lista real de eventos Quic, com detalhe ao toque. Sem RSVP, bilhetes ou inscrição nesta fase, é puramente informativo.

## Estado atual

- Tabela `events` (migration `0001_initial_schema.sql`) já tem os campos necessários para um feed: `name`, `description`, `venue_name`, `venue_address`, `start_datetime`, `end_datetime`, `status`. Não tem imagem de capa nem flag de visibilidade pública.
- RLS em `events` só permite leitura a membros da organização (via `get_user_org_id()`); não há policy pública.
- `app/dashboard/events/[eventId]/edit/page.tsx` + `actions.ts` já é o formulário real de edição de eventos (distinto de `stock_events`, que é logística interna de material e não deve ser confundido com isto).
- `schemas/event.schema.ts` define `updateEventSchema` via zod; será estendido.
- App mobile: `mobile/app/(tabs)/index.tsx` é atualmente um placeholder ("Em breve: eventos Quic").

## Decisões desta fase

- **Fonte de dados**: reaproveita a tabela `events` existente, sem tabela nova. Adiciona dois campos: `cover_image_url text` (nullable) e `is_public_listed boolean NOT NULL DEFAULT false`.
- **Acesso**: nova policy RLS pública de leitura em `events`, restrita a `is_public_listed = true`. As policies de membro existentes continuam intactas; a app mobile usa a anon key (sem sessão necessária para ver o feed).
- **Gestão**: o toggle "Publicar no app mobile" e o upload de capa entram no formulário de edição de evento já existente (`app/dashboard/events/[eventId]/edit`), não numa página nova.
- **Detalhe**: informativo apenas (foto, nome, datas, local, descrição). Sem ação de compra/inscrição.

## Alterações de base de dados

Nova migration `0042_events_public_listing.sql`:

```sql
ALTER TABLE events ADD COLUMN cover_image_url text;
ALTER TABLE events ADD COLUMN is_public_listed boolean NOT NULL DEFAULT false;

CREATE POLICY "public_read_listed_events" ON events
  FOR SELECT USING (is_public_listed = true);
```

Aplicar manualmente via SQL Editor, seguindo a mesma convenção das migrations `0040`/`0041` (histórico partilhado com Stock-Plat, sem `supabase db push`).

## Dashboard web

- `schemas/event.schema.ts`: `updateEventSchema` ganha `is_public_listed: z.boolean().optional()`. `cover_image_url` não passa pelo schema de formulário (é gerido por upload de ficheiro, à parte, como acontece com `updateArtistPhoto`).
- Nova server action `updateEventCoverPhoto(eventId, formData)` em `app/dashboard/events/[eventId]/edit/actions.ts`, espelhando `updateArtistPhoto` (`app/dashboard/artists/actions.ts`): valida tamanho/MIME via magic bytes, upload para Vercel Blob, `update events set cover_image_url = ...`.
- `updateEventAction` existente passa a aceitar `is_public_listed` no `data` (já é um update genérico por spread, não precisa de lógica nova além do schema).
- `EditEventPage` (`app/dashboard/events/[eventId]/edit/page.tsx`) ganha: um campo de upload de imagem (preview + botão trocar, mesmo padrão visual de `artist-photo-form.tsx`) e um `Switch`/toggle "Publicar no app mobile" ligado a `is_public_listed`, com texto de apoio a explicar que só eventos publicados aparecem no feed.

## App mobile

```
mobile/app/(tabs)/index.tsx      # deixa de ser placeholder: lista de eventos públicos
mobile/app/evento/[id].tsx       # novo: ecrã de detalhe
mobile/lib/events.ts             # nova: fetchPublicEvents(), fetchEventById(id)
```

- `mobile/lib/events.ts`: `fetchPublicEvents()` faz `supabase.from('events').select('id, name, description, venue_name, venue_address, start_datetime, end_datetime, cover_image_url').eq('is_public_listed', true).order('start_datetime', { ascending: true })`. `fetchEventById(id)` mesma seleção com `.eq('id', id).single()`.
- Tab Início: lista vertical de cards (imagem de capa full-width ou placeholder cinza se `cover_image_url` for null, nome em serif, data formatada, local). Estado vazio: "Sem eventos agendados." em cinza, sem ilustração (consistente com o resto da app).
- Ecrã de detalhe (`mobile/app/evento/[id].tsx`): hero com foto de capa (ou fundo escuro sólido se sem foto), nome em serif grande, datas, local/morada, descrição. Sem botão de ação além de eventual partilha nativa (`expo-sharing`, opcional, decidir na implementação se o tempo permitir; não é bloqueador desta fase).

## Testes

- **Unit (mobile)**: `mobile/lib/events.test.ts` — testa que `fetchPublicEvents`/`fetchEventById` constroem a query certa (mesma abordagem de mock usada em `mobile/lib/role.test.ts`).
- **Component (mobile)**: teste do card de evento (formatação de data, fallback de imagem) e do estado vazio da lista.
- **Web**: `__tests__/events-edit-actions.test.ts` (ou extensão de um ficheiro existente, a confirmar no plano) cobre `updateEventCoverPhoto` (mesmo padrão de `artists-server-actions.test.ts` para `updateArtistPhoto`) e a passagem de `is_public_listed` por `updateEventAction`.
- **RLS**: verificação manual via SQL Editor de que um pedido sem sessão (anon) só vê eventos com `is_public_listed = true`.
- **E2E**: fora de escopo (mesma decisão da fase 1).

## Fora de escopo

- RSVP, bilhetes, inscrição ou qualquer ação transacional no evento.
- Notificações push sobre eventos novos.
- Partilha social além do share nativo opcional já mencionado.
- Filtros/pesquisa no feed (lista simples ordenada por data, sem categorias nesta fase).
