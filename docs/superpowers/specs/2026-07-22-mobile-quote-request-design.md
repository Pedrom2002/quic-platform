# App mobile Quic: pedido de orçamento a partir do catálogo Design

## Contexto

O site (web) já tem um fluxo público de pedido de orçamento: no catálogo de stock (`/stock`), o cliente adiciona materiais a um carrinho e na página `/stock/pedido` revê os itens, preenche os seus dados e submete. A submissão chama a server action `submitQuoteRequest`, que valida com `quoteRequestSchema` (zod) e invoca o RPC atómico `stock_submit_quote` (security definer, com rate-limit, honeypot e validação de material público). O RPC insere em `stock_quote_requests` + `stock_quote_request_items` numa transação.

A app mobile tem uma tab "Catálogo" que hoje só mostra materiais (grid + filtros), sem forma de pedir orçamento. Este design adiciona o mesmo fluxo à app.

## Objetivo

Permitir, na app mobile, adicionar materiais do catálogo a um carrinho e submeter um pedido de orçamento, reutilizando integralmente o backend existente (RPC `stock_submit_quote`) sem qualquer alteração à base de dados.

## Fora de escopo

- Qualquer mudança ao backend/BD (o RPC, tabelas e RLS já existem e servem os dois clientes). Confirmado: `authenticated` e `anon` têm `execute` no RPC.
- Validação de stock disponível: é um pedido de orçamento, não uma reserva. Tal como no site, pedir mais unidades do que há em stock é permitido (a equipa responde depois). O RPC valida só que o material é público/ativo, não a quantidade.
- Histórico de pedidos do utilizador na app (o site também não o mostra ao cliente).
- Notificações push de resposta ao pedido.

## Decisões de UX (confirmadas)

- **Acesso ao pedido**: botão flutuante no ecrã do catálogo, visível apenas quando o carrinho tem itens, com contador; abre o ecrã de pedido.
- **Adicionar ao carrinho**: cada `MaterialCard` ganha um botão "+" que adiciona 1 unidade. As quantidades ajustam-se depois no ecrã de pedido (igual ao site).
- **Persistência do carrinho**: persiste entre sessões via AsyncStorage (já é dependência da app, usada pelo Supabase auth).

## Arquitetura

Reutiliza 100% do backend. A app acrescenta só a camada de UI + estado de carrinho.

### `mobile/hooks/useCart.ts` + provider

Estado global do carrinho via React Context, persistido em AsyncStorage.

- Tipo de item: `{ materialId: string; name: string; unit: string; qty: number }`.
- Estado: `items: CartItem[]`, `isReady: boolean` (false até o AsyncStorage carregar, para evitar flash de carrinho vazio).
- Métodos: `addItem(item)` (se já existe o materialId, incrementa qty em 1; senão adiciona com qty 1), `removeItem(materialId)`, `setQty(materialId, qty)` (mínimo 1), `clear()`.
- Persistência: efeito que grava `items` em AsyncStorage (chave `quic-cart`) a cada mudança; efeito de arranque que lê a chave e popula o estado, depois marca `isReady`.
- `CartProvider` embrulha a app no root layout (`mobile/app/_layout.tsx`), dentro do `SafeAreaProvider`.

### `mobile/lib/quote.ts`

Lógica pura, testável, sem UI.

- `QuoteFormInput` = `{ name: string; email: string; phone: string; eventDate: string; message: string }`.
- `CartLine` = `{ materialId: string; qty: number }`.
- `validateQuote(form, items): string | null` — porta as regras do `quoteRequestSchema`: nome obrigatório (trim, não vazio), email com formato válido (regex simples equivalente ao do schema), telefone/data/mensagem opcionais, pelo menos 1 item. Devolve a primeira mensagem de erro em português, ou `null` se válido.
- `submitQuote(supabase, form, items): Promise<{ success: true } | { success: false; error: string }>` — chama `supabase.rpc('stock_submit_quote', { p_name, p_email, p_phone, p_event_date, p_message, p_items })`, mapeando `eventDate`/`phone`/`message` vazios para `null` e `items` para o formato `[{ materialId, qty }]`. Trata os erros do RPC: mensagem com `rate_limit` → "Demasiados pedidos. Tente novamente mais tarde."; `invalid_items` → "Pedido inválido."; qualquer outro → "Não foi possível submeter o pedido. Tente novamente.".

Nota: não há honeypot na app (o honeypot do site protege contra bots que fazem POST a um form HTML; numa app nativa não se aplica da mesma forma). O rate-limit do RPC continua a proteger contra abuso.

### `mobile/components/MaterialCard.tsx` (modificar)

Adiciona um botão "+" (canto do card, `Ionicons name="add"`) com `onPress` que chama `addItem` do `useCart` com `{ materialId: material.id, name: material.name, unit: material.unit, qty: 1 }`. Feedback: o botão muda brevemente para um check (`Ionicons name="checkmark"`) durante ~1s após adicionar, dando confirmação visual sem precisar de biblioteca de toast.

### `mobile/app/(tabs)/catalogo.tsx` (modificar)

Botão flutuante absoluto no fundo do ecrã, renderizado só quando `items.length > 0`. Mostra "Pedir orçamento (N)" onde N é o total de unidades (soma de qty). `onPress` navega para `/pedido` via `router.push`.

### `mobile/app/pedido.tsx` (criar)

Ecrã de pedido (rota fora das tabs, com header de voltar do Expo Router). Estrutura:

- Se `isReady && items.length === 0`: estado vazio ("O teu pedido está vazio" + botão para voltar ao catálogo).
- Lista de itens: cada linha com nome, unidade, controlo de quantidade (−/+ e valor), botão remover.
- Form: nome (obrigatório), email (obrigatório), telefone (opcional), data do evento (opcional, `TextInput` com placeholder `AAAA-MM-DD` — sem date picker nativo para manter o escopo pequeno; a validação aceita ISO date ou vazio), mensagem (opcional, multiline).
- Botão "Enviar pedido": desativado enquanto submete. Ao tocar: valida com `validateQuote`; se erro, mostra a mensagem; se ok, chama `submitQuote`; em sucesso, `clear()` o carrinho e navega para um estado de sucesso.
- Sucesso: `Alert` nativo de confirmação ("Pedido enviado", "Respondemos com um orçamento sem compromisso.") e volta ao catálogo (`router.back()` ou `router.replace('/(tabs)/catalogo')`). Sem ecrã de sucesso dedicado, para manter o escopo pequeno.

## Tratamento de erros

- Validação local antes de submeter (mensagens em português, uma de cada vez).
- Erros do RPC mapeados para mensagens amigáveis (rate-limit, inválido, genérico).
- `submitQuote` nunca lança: apanha exceções de rede e devolve `{ success: false, error }`.

## Testes

- `mobile/lib/quote.test.ts`:
  - `validateQuote`: nome vazio → erro; email inválido → erro; sem itens → erro; input válido (com opcionais vazios) → null.
  - `submitQuote`: chama `supabase.rpc` com o nome e payload certos (mock do client); mapeia campos vazios para null; sucesso → `{ success: true }`; erro `rate_limit` → mensagem certa; erro `invalid_items` → mensagem certa; erro genérico → mensagem genérica; exceção lançada pelo rpc → `{ success: false }` sem propagar.
- `mobile/hooks/useCart.test.ts` (ou `.tsx`): `addItem` de um novo material adiciona com qty 1; `addItem` repetido do mesmo incrementa qty; `setQty` respeita mínimo 1; `removeItem` remove; `clear` esvazia. AsyncStorage mockado.
- `mobile/components/MaterialCard.test.tsx` (estender): o botão "+" existe e, ao ser premido, chama `addItem` (mock do `useCart`).
- `mobile/__tests__/app/pedido.test.tsx` (criar): estado vazio quando o carrinho está vazio; com itens, mostra os nomes; submeter com form válido chama `submitQuote`; erro de validação mostra a mensagem sem chamar `submitQuote`.

Regra do projeto: o teste do ecrã `pedido` vive em `mobile/__tests__/app/pedido.test.tsx`, nunca dentro de `mobile/app/` (Expo Router trata ficheiros sob `app/` como rotas; um `.test.tsx` lá quebra `expo export`).
