# App mobile Quic: seletor de categorias em modal Design

## Contexto

O catálogo mobile (`mobile/app/(tabs)/catalogo.tsx`) usa `CategoryChips.tsx`, uma barra de chips em scroll horizontal, para filtrar por categoria. Com 15 categorias (Som, Luz, Vídeo, Decoração, Cabos, Instrumentos musicais, Mobiliário, Outros, Segurança, Catering, Staff, Hostesses, Transportes, Seguros, Licenciamentos), o scroll horizontal ficou impraticável: a maioria fica escondida fora do ecrã, exigindo scroll longo para encontrar uma categoria.

## Objetivo

Substituir a barra de chips por um botão compacto que abre um modal com todas as categorias visíveis de uma vez, em grelha de 2 colunas.

## Fora de escopo

- Web (`app/stock/catalog-filters.tsx`) não muda, só mobile.
- Multi-seleção de categorias (continua single-select, como hoje).
- Reordenar ou agrupar categorias.

## Arquitetura

- Novo componente `mobile/components/CategoryPicker.tsx` substitui `CategoryChips.tsx` no catálogo (o ficheiro antigo e o seu teste são removidos).
- `CategoryPicker` recebe as mesmas props que `CategoryChips` tinha: `categories`, `selectedId`, `onSelect`.
- Renderiza um botão pill: texto = nome da categoria selecionada, ou "Categorias" quando `selectedId === null`. Ícone de filtro (`Ionicons "options-outline"`) à esquerda do texto.
- Ao tocar no botão, abre um `Modal` nativo do React Native (`animationType="slide"`, `transparent`, overlay semi-transparente `rgba(0,0,0,0.4)` atrás).
- Dentro do modal: cartão branco ancorado no fundo do ecrã (`borderTopLeftRadius`/`borderTopRightRadius` 20, `paddingBottom` com safe area), cabeçalho "Categorias" + botão fechar (ícone `close`), depois uma grelha `FlatList numColumns={2}` com "Todas" + as categorias.
- Cada item da grelha é um card retangular (não pill), altura fixa ~52px, texto centrado, fundo `#f0efee` inativo / `#9333EA` ativo com texto branco.
- Tocar num item chama `onSelect(id)` e fecha o modal (`setModalVisible(false)`).
- Estado do modal (`visible`) é local ao componente (`useState`), não sobe para o `catalogo.tsx`.

## Tratamento de erros

Nenhum novo — lista de categorias já vem de `fetchCategories` existente, sem mudança de fetch.

## Testes

Novo `mobile/components/CategoryPicker.test.tsx` substitui `CategoryChips.test.tsx`:
- botão mostra "Categorias" quando `selectedId` é `null`.
- botão mostra o nome da categoria quando `selectedId` está definido.
- tocar no botão abre o modal (categorias ficam visíveis).
- tocar numa categoria chama `onSelect` com o id certo e fecha o modal.
- tocar em "Todas" chama `onSelect(null)`.
