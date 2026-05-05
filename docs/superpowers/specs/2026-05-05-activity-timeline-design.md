# Activity Timeline — Design

**Goal:** Mostrar uma timeline em tempo real de tudo o que acontece num evento: checklist, notificações, clientes.

**Constraints:** Sem tabela nova no schema. Sem novas dependências.

---

## Localização

Secção nova na página `app/dashboard/events/[eventId]/page.tsx`, abaixo dos quick links existentes.

## Fontes de Dados

Três queries em paralelo, merge e sort por timestamp descendente, máximo 30 eventos:

| Fonte | Evento | Timestamp |
|---|---|---|
| `event_checklist_items` | status mudou | `updated_at` |
| `notification_jobs` | notificação enviada/falhada | `sent_at` ou `created_at` |
| `event_clients` | cliente adicionado/removido | `created_at` |

Query inicial server-side. Realtime via Supabase channel no cliente escuta as 3 tabelas com `filter: event_id=eq.${eventId}` e prepend ao topo da lista.

## Tipos de Evento na Timeline

```
ChecklistEvent  { type: 'checklist'; item_title: string; status: string; member_name: string | null; timestamp: string }
NotificationEvent { type: 'notification'; client_name: string; channel: string; status: string; timestamp: string }
ClientEvent     { type: 'client'; client_name: string; action: 'added' | 'removed'; role: string; timestamp: string }
```

Merge feito em `lib/timeline.ts` — função pura `mergeTimelineEvents(checklist, notifications, clients): TimelineEvent[]`.

## UI

Lista vertical na página do evento. Cada item:
- Ícone colorido por tipo (checklist=verde, notification=violeta, client=azul)
- Texto descritivo em português (ex: "Sonoplastia marcada como concluída por João")
- Timestamp relativo ("há 3 min") com tooltip do timestamp absoluto
- Máximo 30 items, sem paginação

Realtime: novos eventos aparecem no topo com fade-in. Estado gerido em `ActivityFeed` (Client Component).

## Ficheiros

| Ficheiro | Tipo |
|---|---|
| `lib/timeline.ts` | Novo — tipos + função merge |
| `components/events/ActivityFeed.tsx` | Novo — Client Component com realtime |
| `app/dashboard/events/[eventId]/page.tsx` | Modificado — query inicial + passar dados ao ActivityFeed |
