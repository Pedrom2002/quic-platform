# App mobile Quic: redesign visual Home + Catálogo com animações Design

## Contexto

As tabs "Início" (feed público de eventos) e "Catálogo" (materiais de stock) funcionam mas são visualmente planas: `FlatList` sem animação de entrada, cards com cantos pouco arredondados, imagens pequenas no topo do card, sem estado de loading visível (ecrã em branco até os dados chegarem).

## Objetivo

Redesenhar os cards e o feed de ambas as tabs para uma estética mais moderna e "visual-first" (imagem grande, hierarquia clara, entrada suave), alinhado com padrões atuais de apps de descoberta de eventos (cards com imagem full-bleed, gradiente para legibilidade de texto sobreposto, grid com skeleton loading em vez de ecrã vazio).

## Fora de escopo

- Mudanças de dados/lógica de negócio (fetch, paginação, filtros) — só camada visual.
- Animações de saída (exit) ou gestos (swipe, drag) — só entrada.
- Dark mode.
- Alterar a tab Portal ou Mais (já tratadas em specs anteriores).

## Dependências novas

- `react-native-reanimated` (Expo SDK 57 compatível, instalar via `npx expo install react-native-reanimated`) — animações de entrada em cascata.
- `expo-linear-gradient` (via `npx expo install expo-linear-gradient`) — gradiente escuro sobre a imagem do `EventCard` para legibilidade do texto.

## Home (`EventCard` + `index.tsx`)

**`EventCard` redesenhado:**
- Imagem full-bleed (`height: 220`, `borderRadius: 14`), sem área de conteúdo separada por baixo — texto sobreposto na imagem.
- `LinearGradient` (`transparent` → `rgba(0,0,0,0.85)`, de 40% a 100% da altura) posicionado absoluto sobre a imagem, garante contraste do texto branco mesmo em fotos claras.
- Texto sobreposto no canto inferior: data+local em maiúsculas/cinza claro (11px), nome do evento (20px, bold, branco).
- Badge de bilhete (já existente, `min_ticket_price_cents`) redesenhado como pill branco com texto preto, posicionado por baixo do nome, dentro da área de gradiente. Mantém a lógica já implementada: "Gratuito" se preço mínimo 0, "Comprar bilhetes" senão, ausente se não há `ticket_types`.
- Sem imagem de capa (`cover_image_url === null`): mantém o fallback atual (`View` com fundo `#111111`), gradiente e texto continuam a funcionar por cima igual.

**`index.tsx`:**
- `FlatList` passa `index` ao `renderItem`, envolve cada `EventCard` num `Animated.View` com `entering={FadeInDown.delay(index * 80).duration(400).easing(Easing.out(Easing.quad))}`.
- Sem mudança de lógica de fetch/estado — só a wrapper de animação à volta do card já renderizado.

## Catálogo (`MaterialCard` + `CategoryChips` + `catalogo.tsx`)

**`MaterialCard`:**
- `borderRadius` de 6 para 12.
- Mantém estrutura atual (imagem 120px topo + conteúdo por baixo) — já funciona bem em grid 2 colunas, não precisa do tratamento full-bleed do evento (cards mais pequenos, menos espaço para overlay legível).
- Envolvido em `Animated.View` com `entering={FadeIn.delay(index * 40).duration(300)}` (delay menor que o da Home porque há mais itens visíveis de uma vez).

**`CategoryChips`:**
- `borderRadius` de 4 para 20 (pill completo), mantém o resto (cores, comportamento de seleção) inalterado.

**Novo: `MaterialCardSkeleton`** (`mobile/components/MaterialCardSkeleton.tsx`):
- Mesma estrutura visual do `MaterialCard` (imagem 120px + 2 linhas de texto placeholder), mas com blocos cinza (`#e7e5e4`) em vez de conteúdo real.
- Shimmer: `Animated.View` com gradiente diagonal semi-transparente que desliza da esquerda para a direita em loop (`withRepeat(withTiming(...))`), sobreposto ao bloco da imagem.
- Sem props — componente puramente visual, sem dados.

**`catalogo.tsx`:**
- Quando `materials === null` (ainda a carregar, estado que já existe no código atual mas hoje não renderiza nada visível): renderiza uma grid 2 colunas de 6 `MaterialCardSkeleton` em vez de `null`/vazio.
- Quando `materials` chega (não é mais `null`): grid real substitui os skeletons, cada `MaterialCard` anima entrada como descrito acima.
- Paginação (`onEndReached`, itens adicionados ao array já existente): novos itens no fim da lista também animam entrada (o `index` já reflete a posição correta no array combinado).

## Tratamento de erros

Nenhum novo caminho de erro introduzido — esta mudança é puramente visual sobre dados/estados já existentes e já tratados (loading, vazio, erro de fetch tratado em `lib/events.ts`/`lib/catalog.ts` devolvendo array vazio).

## Testes

Testes existentes (`EventCard.test.tsx`, `MaterialCard.test.tsx`, `CategoryChips.test.tsx`, `index.test.tsx`, `catalogo.test.tsx`) continuam a validar o mesmo comportamento funcional (texto renderizado, navegação, fetch) — não precisam mudar de asserções, mas podem precisar de mocks para `react-native-reanimated` e `expo-linear-gradient` se os testes atuais não os suportarem nativamente (confirmar ao implementar; `jest-expo` preset pode já cobrir isto).

Novo teste para `MaterialCardSkeleton.tsx`: confirma que renderiza sem props e sem erros (smoke test simples, componente sem lógica).

`catalogo.test.tsx` ganha um caso novo: quando `fetchCatalogMaterials`/`fetchCategories` ainda não resolveram (materials é `null`), confirma que 6 elementos skeleton são renderizados (via `testID` no `MaterialCardSkeleton`).
