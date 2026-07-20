# App mobile Quic: portal do artista com dados reais (fase 4)

## Contexto

Quarta e última fase planeada para a app mobile Quic:

1. Setup base + auth (feito, mergeado em `master`)
2. Feed de eventos público (feito, mergeado em `master`)
3. Catálogo de produtos (feito, mergeado em `master`)
4. **Portal do artista mobile com dados reais** (este spec)

A tab "Portal" já resolve o papel do utilizador autenticado (`resolveUserRole`, fase 1) e mostra placeholder com o nome do artista quando `role.role === 'artist'`. Esta fase substitui esse placeholder pelos dados reais: agenda, imprensa, conteúdos e documentos, espelhando o portal web já existente (`app/artista/[token]/ArtistPortalClient.tsx`).

## Estado atual

- `mobile/app/(tabs)/portal.tsx` já resolve `client` vs `artist` (fase 1) e mostra só o nome do artista para o segundo caso.
- Tabelas `artist_agenda_items`, `artist_clippings`, `artist_assets` (migration `0040_artists_init.sql`) só têm RLS para membros da organização (`organization_id = get_user_org_id()`), sem policy de leitura para o próprio artista via `auth_user_id`.
- `lib/artists/portal-helpers.ts` (Next.js) já tem `splitAgenda`/`splitAssets`, funções puras testadas, usadas pelo portal web. Como `mobile/` é um pacote separado sem acesso direto a `lib/` do Next.js, esta lógica precisa de ser portada (não importada) para `mobile/lib/`.
- `lib/artists/portal-data.ts` (Next.js) mostra o padrão de query completo a replicar: busca `artists` por `auth_user_id`/`portal_token`, depois `artist_agenda_items` (filtrado por `is_visible = true`), `artist_clippings` (ordenado por `published_at`), `artist_assets` (ordenado por `created_at`, dividido em conteúdos/documentos por `section`).
- Downloads no portal web passam por uma rota server (`/api/artist-portal/download`) que valida o token antes de servir o blob. Os `blob_url` são públicos no Vercel Blob (`access: 'public'`, confirmado em `updateArtistPhoto`/`updateEventCoverPhoto`), pelo que a app mobile pode abrir estes links diretamente sem rota equivalente.

## Decisões desta fase

- **RLS nova**: policies `artist_read_own_agenda`, `artist_read_own_clippings`, `artist_read_own_assets` em `artist_agenda_items`/`artist_clippings`/`artist_assets`, todas `FOR SELECT USING (artist_id IN (SELECT id FROM artists WHERE auth_user_id = auth.uid()))`. Aditivas às policies de equipa já existentes.
- **Lógica portada, não importada**: `splitAgenda`/`splitAssets` recriadas em `mobile/lib/artistPortal.ts` (mesma assinatura e comportamento, testadas de novo no contexto mobile).
- **Downloads/links**: sem rota server nova. `Linking.openURL` do Expo abre `clipping.url`, `asset.external_url` ou `asset.blob_url` diretamente no browser do telemóvel.
- **Sem upload nem edição**: esta fase é só leitura, tal como o portal web atual.

## Alterações de base de dados

Nova migration `0043_artist_portal_self_read.sql`:

```sql
CREATE POLICY "artist_read_own_agenda" ON artist_agenda_items
  FOR SELECT USING (artist_id IN (SELECT id FROM artists WHERE auth_user_id = auth.uid()));

CREATE POLICY "artist_read_own_clippings" ON artist_clippings
  FOR SELECT USING (artist_id IN (SELECT id FROM artists WHERE auth_user_id = auth.uid()));

CREATE POLICY "artist_read_own_assets" ON artist_assets
  FOR SELECT USING (artist_id IN (SELECT id FROM artists WHERE auth_user_id = auth.uid()));
```

Aplicar manualmente via SQL Editor, seguindo a convenção já usada (`0040`/`0041`/`0042`).

## App mobile

```
mobile/lib/artistPortal.ts        # nova: fetchArtistPortalData(), splitAgenda(), splitAssets()
mobile/app/(tabs)/portal.tsx      # modificado: mostra dados reais em vez de só o nome
```

- `fetchArtistPortalData(supabase, artistId)`: busca em paralelo `artist_agenda_items` (`eq('artist_id', ...).eq('is_visible', true)`), `artist_clippings` (`eq('artist_id', ...).order('published_at', { ascending: false, nullsFirst: false })`), `artist_assets` (`eq('artist_id', ...).order('created_at', { ascending: false })`). Devolve `{ upcoming, past, clippings, contents, documents }` já processado pelas funções de split.
- `splitAgenda`/`splitAssets`: portadas de `lib/artists/portal-helpers.ts`, mesma assinatura e comportamento (upcoming ordenado asc, past ordenado desc; contents/documents separados por `section`).
- Tab Portal (artista): hero escuro (nome grande, foto se houver, bio), tab-bar interna condicional (só mostra Imprensa/Conteúdos/Documentos se houver dados nessas secções, tal como o web), e conteúdo de cada aba:
  - Agenda: "Próximos" + secção colapsável "Passados".
  - Imprensa: lista de links, abre `Linking.openURL(clipping.url)`.
  - Conteúdos: grid com thumbnail/emoji fallback, abre `external_url` ou `blob_url`.
  - Documentos: lista, abre o link correspondente.
- Estado vazio por secção: texto cinza, sem ilustração, consistente com o resto da app.

## Testes

- **Unit (mobile)**: `mobile/lib/artistPortal.test.ts` — testa `splitAgenda`/`splitAssets` (casos puros, sem mock de rede) e `fetchArtistPortalData` (mock do Supabase client, mesma abordagem das fases anteriores).
- **Screen (mobile)**: teste da tab Portal cobrindo o caso artista com dados completos e o caso artista sem dados em alguma secção (tabs condicionais escondem-se corretamente).
- **RLS**: verificação manual via SQL Editor, autenticado como o artista, confirmando que só vê os próprios registos nas 3 tabelas.
- **Teste de ficheiro dentro de `mobile/app/`**: seguir a regra já estabelecida no projeto (`mobile/__tests__/app/(tabs)/portal.test.tsx`), nunca colocar o teste dentro de `mobile/app/`.

## Fora de escopo

- Upload ou edição de qualquer dado do artista a partir da app (fica reservado ao dashboard web).
- Notificações push sobre novos itens de agenda/imprensa.
- Pré-visualização de PDF/imagem dentro da app (abre sempre externamente via `Linking.openURL`).
