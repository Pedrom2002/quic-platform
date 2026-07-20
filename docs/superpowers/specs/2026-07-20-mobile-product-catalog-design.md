# App mobile Quic: catálogo de produtos (fase 3)

## Contexto

Terceira de 4 fases planeadas para a app mobile Quic:

1. Setup base + auth (feito, mergeado em `master`)
2. Feed de eventos público (feito, mergeado em `master`)
3. **Catálogo de produtos/stock** (este spec)
4. Portal do artista mobile (dados reais)

Esta fase substitui o placeholder da tab "Catálogo" por uma navegação real ao catálogo público de material (Stock-Plat), reaproveitando infraestrutura de dados já existente e já usada pelo site público (`app/stock/page.tsx`).

## Estado atual (o que já existe)

- Tabelas `stock_materials`, `stock_categories`, `stock_movements` (migration `0034_stock_init.sql`), partilhadas com o projeto Stock-Plat.
- View pública `stock_catalog_materials`: expõe apenas `id, name, description, category_id, unit, photo_url, available` (disponibilidade calculada a partir de `stock_movements`, sem expor movimentos em si). Filtra automaticamente por `is_public = true and active = true`.
- RLS já configurada: `stock anon select public materials` e `stock anon select categories` permitem leitura anónima da view e das categorias, sem necessidade de sessão.
- `app/stock/page.tsx` (Next.js) já consome esta view com pesquisa (`ilike` no nome), filtro por categoria, paginação (`range()`), e um carrinho + fluxo de pedido de orçamento (`stock_quote_requests`).
- `lib/stock/types.ts` define `StockCategory` e `StockCatalogMaterial` (tipos já corretos, apenas colunas públicas).
- App mobile: `mobile/app/(tabs)/catalogo.tsx` é atualmente um placeholder ("Em breve: catálogo de produtos").

## Decisões desta fase

- **Sem migration nova**: reaproveita a view e RLS já existentes, criadas para o Stock-Plat/site público.
- **Só navegação/leitura**: sem carrinho, sem submissão de pedido de orçamento (`stock_quote_requests`) nesta fase. Ver produtos, pesquisar, filtrar por categoria, ver disponibilidade. O pedido de orçamento continua a ser feito através do site.
- **Sem ecrã de detalhe de produto**: a view pública já expõe todos os campos relevantes (nome, descrição, foto, categoria, disponibilidade) diretamente no card; não há dados extra para um ecrã de detalhe justificar nesta fase.
- **Paginação**: infinite scroll (`onEndReached` do `FlatList`, páginas de 20), ao contrário do web que usa paginação por botões — mais natural em mobile.
- **Pesquisa**: campo de texto com debounce de 300ms antes de re-executar a query, para não disparar um pedido por cada tecla.

## App mobile

```
mobile/lib/catalog.ts                    # nova: fetchCategories(), fetchCatalogMaterials()
mobile/components/CategoryChips.tsx      # nova: chips de categoria
mobile/components/MaterialCard.tsx       # nova: card de produto
mobile/app/(tabs)/catalogo.tsx           # deixa de ser placeholder: grid real
```

- `fetchCategories(supabase)`: `select * from stock_categories order by sort_order`.
- `fetchCatalogMaterials(supabase, { search, categoryId, from, to })`: query sobre `stock_catalog_materials`, com `ilike('name', ...)` se houver pesquisa, `eq('category_id', ...)` se houver categoria selecionada, `order('name')`, `range(from, to)`.
- `CategoryChips`: linha horizontal scrollável, "Todas" (sem filtro) + uma chip por categoria; chip ativa em preto, inativas em stone-400 (consistente com o resto do design system).
- `MaterialCard`: foto (ou placeholder cinza `#e7e5e4` se `photo_url` for null), nome, categoria em uppercase pequeno, badge de disponibilidade ("Disponível" verde / "Sob consulta" cinza).
- Tab Catálogo: campo de pesquisa no topo, `CategoryChips` abaixo, `FlatList` em grid de 2 colunas com `MaterialCard`, `onEndReached` carrega mais 20, estado vazio "Nenhum material encontrado." em cinza sem ilustração.

## Testes

- **Unit (mobile)**: `mobile/lib/catalog.test.ts` — testa a query exata construída por `fetchCategories`/`fetchCatalogMaterials` (mock do Supabase client, mesma abordagem de `mobile/lib/events.test.ts`), incluindo os casos com/sem `search`/`categoryId`.
- **Component (mobile)**: `MaterialCard.test.tsx` (nome, categoria, fallback de imagem, badge de disponibilidade) e `CategoryChips.test.tsx` (seleção, chip "Todas").
- **Screen (mobile)**: `catalogo.test.tsx` — estado vazio, lista renderizada, mock de fetch.
- **RLS**: nenhuma alteração de schema nesta fase, sem verificação manual adicional necessária (já coberta pela fase Stock-Plat original).

## Fora de escopo

- Carrinho e submissão de pedido de orçamento (`stock_quote_requests`).
- Ecrã de detalhe de produto.
- Pull-to-refresh.
- Alterações à view `stock_catalog_materials` ou às RLS policies existentes.
