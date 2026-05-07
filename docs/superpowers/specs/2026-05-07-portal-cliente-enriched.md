# Portal do Cliente — Enriquecido

**Data:** 2026-05-07
**Estado:** Aprovado

## Contexto

O portal do cliente (`/portal/[token]`) mostra actualmente: hero com progresso, checklist de itens concluídos e em preparação, realtime via Supabase. O cliente não vê datas de previsão, ficheiros anexados nem informação detalhada do evento.

## Objectivo

Adicionar: datas de previsão por item, ficheiros para download (nível evento e por item), e navegação por tabs para organizar o conteúdo sem quebrar o paradigma scroll-first existente.

## Layout

```
Hero (full-screen, existente)
  ↓ scroll
[ Progresso | Documentos | Detalhes ]  ← tabs sticky, position: sticky
  conteúdo da tab activa (React state: activeTab)
Footer (existente)
```

Tabs ficam coladas ao topo da zona branca quando o utilizador faz scroll além do hero. Conteúdo troca no mesmo container com fade. Tab "Progresso" activa por defeito.

## Tabs

### Tab: Progresso (default)

Conteúdo igual ao actual, com dois enriquecimentos:

1. **`due_at` badge** — itens com status `pending` ou `in_progress` que tenham `due_at` mostram badge "Previsto DD Mmm" em âmbar. Itens sem `due_at` não mostram nada.
2. **Ficheiros inline** — itens com ficheiros associados mostram-nos abaixo da `completion_note`, como lista de pills com ícone de clip e botão download. Só renderiza se `item.files.length > 0`.

### Tab: Documentos

Lista de ficheiros do evento (`eventFiles`). Cada ficheiro: nome, tamanho formatado, tipo, botão "↓ Download" (`<a href={blob_url} download>`). Tab só aparece no nav se `eventFiles.length > 0`. Se não houver ficheiros de evento, a tab não é renderizada.

### Tab: Detalhes

Grid 2 colunas com info estática: Data, Local, Estado, Progresso (%). Dados já disponíveis via props existentes — zero queries extra.

## Camada de Dados

### Tipos novos/alterados (`lib/portal/data.ts`)

```ts
export interface PortalItemFile {
  id: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  blob_url: string
}

export interface PortalItem {
  // existente
  id: string
  client_label: string | null
  title: string
  status: string
  completed_at: string | null
  completion_note: string | null
  position: number
  // novo
  due_at: string | null
  files: PortalItemFile[]
}

export interface PortalEventData {
  // existente
  event: { ... }
  eventDateStr: string
  items: PortalItem[]
  progress: { total: number; completed: number; percent: number }
  heroVideo: string | null
  contentVideo: string | null
  // novo
  eventFiles: PortalItemFile[]
}
```

### Queries em `getPortalData`

Estratégia: 4 queries totais (era 2), sem N+1.

1. `events` — existente, sem alteração
2. `event_checklist_items` — adicionar `due_at` ao select
3. `checklist_item_files` JOIN `event_files` WHERE `event_id = X` — todos os ficheiros ligados a itens do evento, agrupados por `checklist_item_id` via `Map` em JS
4. `event_files` WHERE `event_id = X` — ficheiros de nível evento (não filtrar por item aqui; a distinção é feita pela query 3: ficheiros que aparecem na query 3 são de item, os restantes são de evento)

Query 4 implementação: buscar todos os `event_files` WHERE `event_id = X`, depois filtrar em JS os IDs que NÃO aparecem nos resultados da query 3. Evita subquery complexa no Supabase client.

Agrupamento de ficheiros por item feito em memória antes de retornar — O(n) onde n = total de ficheiros do evento.

### Props novas em `PortalClient`

```ts
interface Props {
  // existente (sem alteração)
  eventId, eventName, venueName, eventDate, status,
  initialItems, initialProgress, portalToken, heroVideo, contentVideo
  // novo
  eventFiles: PortalItemFile[]
}
```

`page.tsx` passa `eventFiles={data.eventFiles}`.

## Componentes

### `PortalClient.tsx`

- Adicionar estado `activeTab: 'progress' | 'documents' | 'details'`
- Renderizar barra de tabs sticky após o hero (antes do `<section>` de conteúdo actual)
- Condicionalmente renderizar conteúdo por tab activa
- Tab "Documentos" só aparece na barra se `eventFiles.length > 0`
- Animação de fade entre tabs: `opacity` transition 150ms

### Sub-componentes (dentro do mesmo ficheiro, não ficheiros separados)

- `TabBar` — barra de navegação com indicador activo
- `ProgressTab` — conteúdo actual de checklist + enriquecimentos
- `DocumentsTab` — lista de ficheiros do evento
- `DetailsTab` — grid de info do evento
- `FileRow` — pill de ficheiro reutilizado em `ProgressTab` e `DocumentsTab`

## Realtime

Sem alterações. O canal Supabase continua a ouvir `event_checklist_items`. Ficheiros não têm realtime (não faz sentido para download).

## Regras de visibilidade

- `due_at` — só mostrar em itens `pending` e `in_progress`
- Ficheiros por item — mostrar independentemente do status do item
- Tab Documentos — só renderizar se `eventFiles.length > 0`
- Secção ficheiros dentro de item — só renderizar se `item.files.length > 0`

## O que NÃO muda

- Schema de base de dados (zero migrações)
- Token de portal e autenticação
- Hero, progress bar, animações existentes
- Footer e indicador de realtime
- API route `/api/portal/[token]`
