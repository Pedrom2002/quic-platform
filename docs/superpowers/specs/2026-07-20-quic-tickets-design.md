# QUIC Tickets: bilheteira própria (núcleo: venda + pagamento + QR)

## Contexto

Primeira de várias iniciativas do "Ecossistema QUIC APP" pedido pelo utilizador (QUIC Rentals, QUIC Creator, QUIC Tickets). QUIC Rentals já foi resolvido como seed de dados no catálogo existente (sem novo código). QUIC Creator fica para uma iniciativa futura própria.

Este spec cobre o núcleo mínimo vendável de QUIC Tickets: compra de bilhete com pagamento real (Stripe), emissão de QR code, e validação de entrada por staff via scanner na app mobile. Wallet, transferência entre utilizadores, revenda autorizada e estatísticas avançadas ficam fora de escopo desta fase.

## Estado atual

- App mobile (4 fases já mergeadas): auth (client/artist via `resolveUserRole`), feed de eventos públicos, catálogo, portal do artista.
- Dashboard web: gestão de eventos em `app/dashboard/events/[eventId]/edit`.
- `team_members` (schema inicial) já tem `auth_user_id` ligado a `auth.users`, com `role` (`admin`/`manager`/`member`) — mesmo padrão usado por `artists.auth_user_id` (fase 1 mobile).
- Sem gateway de pagamento integrado no repo até agora.
- `events` (fase 2 mobile) já tem `is_public_listed` para controlar visibilidade no feed público.

## Decisões desta fase

- **Gateway**: Stripe. Checkout Session por compra (não Payment Intent manual), mais simples de integrar e já suporta múltiplos métodos de pagamento relevantes em Portugal.
- **Onde se compra**: só na app mobile (não no site público, não expande o portal web).
- **Onde se gerem tipos de bilhete/preços**: dashboard web, dentro da página de edição de evento já existente.
- **Quem faz check-in**: staff da organização (membros do dashboard, `team_members`), via scanner de QR na própria app mobile — não um convite separado, reaproveita o login de equipa já existente.
- **Fonte da verdade do pagamento**: webhook Stripe, nunca o cliente confirma diretamente a compra. Os bilhetes só são criados quando o webhook confirma `payment_intent.succeeded` (ou `checkout.session.completed`).

## Alterações de base de dados

Nova migration `0044_quic_tickets_core.sql`:

```sql
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
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type_id           uuid NOT NULL REFERENCES ticket_types(id) ON DELETE RESTRICT,
  event_id                 uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  buyer_auth_user_id       uuid NOT NULL REFERENCES auth.users(id),
  qr_code                  uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status                   text NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'refunded')),
  stripe_checkout_session_id text,
  used_at                  timestamptz,
  used_by_team_member_id   uuid REFERENCES team_members(id),
  created_at               timestamptz NOT NULL DEFAULT now()
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
-- Sem policy de INSERT/UPDATE para authenticated/anon: escrita só via service role
-- (webhook Stripe cria, RPC de check-in com SECURITY DEFINER atualiza).
```

Seguindo a convenção já estabelecida (`0040`-`0043`): aplicar manualmente via SQL Editor / Management API, nunca `supabase db push`.

## Dashboard web

- `app/dashboard/events/[eventId]/tickets/page.tsx` (nova sub-página, não dentro do formulário de edição principal para não sobrecarregar essa página): lista tipos de bilhete do evento, formulário criar/editar (nome, preço, quantidade), toggle ativo/inativo.
- Server actions em `app/dashboard/events/[eventId]/tickets/actions.ts`: `createTicketType`, `updateTicketType`, `toggleTicketTypeActive` — seguem o padrão já estabelecido (`requireOrgAuth`, validação zod, `revalidatePath`).

## App mobile

```
mobile/lib/tickets.ts           # fetchTicketTypes(eventId), fetchMyTickets(), createCheckoutSession()
mobile/lib/checkin.ts           # checkInTicket(qrCode) via RPC
mobile/app/evento/[id].tsx      # modificado: mostra tipos de bilhete + botão comprar
mobile/app/tickets/index.tsx    # novo: "Os meus bilhetes", lista com QR code
mobile/app/scanner.tsx          # novo: só visível p/ staff, câmara + validação
```

- `fetchTicketTypes`/`createCheckoutSession`: Server Action Next.js exposta via API route (`app/api/tickets/checkout/route.ts`), não diretamente do Supabase client — porque criar uma Stripe Checkout Session precisa da secret key, que nunca vai para o mobile. A app mobile chama este endpoint HTTP, recebe a `url` da sessão Stripe, abre em `WebBrowser.openBrowserAsync` (Expo).
- Depois do pagamento, Stripe redireciona para uma deep link da app (`quicapp://tickets/success`) configurada no Checkout Session (`success_url`).
- `mobile/app/tickets/index.tsx`: busca `tickets` do próprio comprador via Supabase client normal (RLS já filtra), mostra QR code (biblioteca `react-native-qrcode-svg` ou similar) por bilhete.
- `resolveUserRole` (fase 1) estende com um 4º caso: consulta `team_members` por `auth_user_id`, devolve `{ role: 'staff', member: {...} }` se encontrado (checado depois de `artist`, antes de cair em `client`).
- `mobile/app/scanner.tsx`: só renderiza para `role.role === 'staff'`. Usa `expo-camera` (barcode scanning) para ler o QR, chama RPC `check_in_ticket(qr_code)`.

## Webhook Stripe

- `app/api/webhooks/stripe/route.ts` (novo): verifica assinatura Stripe, trata `checkout.session.completed` — lê `client_reference_id`/`metadata` para saber `ticket_type_id` e `buyer_auth_user_id`, cria N linhas em `tickets` com `createAdminClient()` (service role, ignora RLS), incrementa `ticket_types.quantity_sold`.
- Idempotência: verifica se já existe um `tickets` row com aquele `stripe_checkout_session_id` antes de criar (evita duplicar em retry do Stripe).

## RPC de check-in

```sql
create or replace function check_in_ticket(p_qr_code uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket tickets;
begin
  select * into v_ticket from tickets where qr_code = p_qr_code;

  if v_ticket is null then
    return jsonb_build_object('success', false, 'error', 'Bilhete não encontrado');
  end if;

  if v_ticket.status = 'used' then
    return jsonb_build_object('success', false, 'error', 'Bilhete já validado', 'used_at', v_ticket.used_at);
  end if;

  if v_ticket.status = 'refunded' then
    return jsonb_build_object('success', false, 'error', 'Bilhete reembolsado');
  end if;

  update tickets
  set status = 'used', used_at = now(),
      used_by_team_member_id = (select id from team_members where auth_user_id = auth.uid())
  where id = v_ticket.id;

  return jsonb_build_object('success', true);
end;
$$;
```

`SECURITY DEFINER` com `search_path` fixo (mesmo padrão já usado no trigger de stock em `0034_stock_init.sql`), para garantir a verificação de estado ver o registo real independente de RLS do chamador. Só pode ser chamado por utilizador autenticado (grant explícito, não a `anon`).

## Testes

- **Unit (web)**: `__tests__/ticket-types-actions.test.ts` — testa `createTicketType`/`updateTicketType` com mocks (padrão já estabelecido).
- **Unit (mobile)**: `mobile/lib/tickets.test.ts`, `mobile/lib/checkin.test.ts` — mocks de Supabase client, seguindo o padrão das fases anteriores.
- **Webhook**: `__tests__/stripe-webhook.test.ts` — testa que `checkout.session.completed` cria os bilhetes certos, testa idempotência (evento repetido não duplica), testa assinatura inválida rejeitada.
- **RLS**: verificação manual — comprador só vê os próprios bilhetes, staff vê todos da org, ninguém consegue inserir/atualizar `tickets` diretamente (fora do RPC/webhook).

## Fora de escopo (fica para iniciativas futuras)

- Wallet (histórico/agregação de bilhetes fora do evento específico).
- Transferência de bilhete entre utilizadores.
- Revenda autorizada (marketplace secundário).
- Estatísticas avançadas (dashboards de vendas, ocupação em tempo real).
- Reembolsos automáticos (esta fase não trata `status='refunded'` como fluxo ativo, só como estado possível a suportar mais tarde).
