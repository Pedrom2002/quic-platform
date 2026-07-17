# App mobile Quic: setup + autenticação (fase 1)

## Contexto

App mobile Quic (React Native / Expo) para clientes finais e artistas agenciados. Escopo total decomposto em 4 sub-projetos sequenciais:

1. **Setup base + auth** (este spec)
2. Feed de eventos público
3. Catálogo de produtos/stock
4. Portal do artista mobile (dados reais: agenda, imprensa, conteúdos, documentos)

Este spec cobre apenas o sub-projeto 1: scaffold do projeto, navegação em 4 tabs, autenticação real via Supabase Auth, e distinção de papel (cliente vs artista). Os ecrãs de conteúdo real ficam como placeholders; conteúdo funcional vem nas fases seguintes.

## Estado atual (o que já existe)

- Repo `quic-plat` é uma app Next.js única (não monorepo). Sem projeto mobile.
- `lib/supabase/{client,server,admin}.ts` usam `@supabase/ssr` (web-only, não serve para Expo).
- Tabela `artists` (migration `0040_artists_init.sql`) tem `portal_token` para acesso web sem password, mas **nenhuma ligação a `auth.users`**.
- Dashboard interno (`app/dashboard/**`) usa Supabase Auth com `organization_id` via `get_user_org_id()`, um modelo totalmente à parte do portal do artista.
- Portal do artista web (`app/artista/[token]/ArtistPortalClient.tsx`) define o sistema visual a replicar: preto/branco/stone, serif (Playfair Display) para títulos grandes, uppercase tracking-widest para labels, cards `stone-50` com borda hairline, tagline "No Stage Is Too Big".

## Decisões desta fase

- **Stack**: Expo (SDK atual, TypeScript, Expo Router para navegação file-based).
- **Localização**: pasta nova `/mobile` dentro do repo atual, `package.json` próprio, git history partilhado com o resto do projeto.
- **Auth**: Supabase Auth real (email+password, com opção de magic link), sessão persistida com `AsyncStorage`. Mesmo projeto Supabase do quic-plat (env `SUPABASE_URL`/`ANON_KEY` partilhados, como já acontece com Stock-Plat).
- **Dois papéis de utilizador, uma única tabela `auth.users`**:
  - **Cliente**: signup público, sem passo extra. Role por omissão.
  - **Artista**: sem signup público. Recebe convite do dashboard (`inviteUserByEmail`), a conta fica ligada ao registo `artists` existente via nova coluna `auth_user_id`.
- **Resolução de papel pós-login**: app consulta `select id from artists where auth_user_id = auth.uid()`. Encontrou → artista (mostra dados próprios na tab Portal). Não encontrou → cliente (tab Portal mostra "acesso reservado a artistas").

## Alterações de base de dados

Nova migration `0041_artists_auth_user.sql`:

```sql
ALTER TABLE artists ADD COLUMN auth_user_id uuid REFERENCES auth.users(id);
CREATE UNIQUE INDEX idx_artists_auth_user_id ON artists(auth_user_id) WHERE auth_user_id IS NOT NULL;

ALTER TABLE artists ENABLE ROW LEVEL SECURITY; -- já ativo, só nova policy
CREATE POLICY "artist_read_own_artist" ON artists
  FOR SELECT USING (auth_user_id = auth.uid());
```

Seguindo a convenção do ficheiro `0040`: aplicar manualmente via SQL Editor / Management API (histórico de migrações partilhado com Stock-Plat, sem `supabase db push`).

Policies equivalentes (`artist_read_own_*`) em `artist_agenda_items`, `artist_clippings`, `artist_assets` ficam reservadas para a fase 4 (quando o Portal mobile efetivamente lê esses dados); não são necessárias apenas para login/setup.

## Fluxo de convite (dashboard web)

- `app/dashboard/artists/[artistId]/page.tsx` ganha um botão "Convidar para app".
- Server action nova (`app/dashboard/artists/actions.ts`): chama `supabase.auth.admin.inviteUserByEmail(artist.email)` com a service role key, recebe o `user.id` criado, faz `update artists set auth_user_id = $1 where id = $2`.
- Artista recebe o email padrão do Supabase, define password ao abrir o link (fluxo Supabase nativo), depois faz login na app mobile com esse email+password.
- Reenviar convite: mesmo botão reexecuta o `inviteUserByEmail` se `auth_user_id` ainda for `null`; se já preenchido, botão fica desativado com indicação "já convidado".

## Navegação mobile (Expo Router)

```
mobile/app/
  _layout.tsx          # root: sem sessão -> redirect /login; com sessão -> (tabs)
  login.tsx
  signup.tsx
  (tabs)/
    _layout.tsx         # tab bar: Início, Catálogo, Portal, Mais
    index.tsx           # Início — placeholder "em breve"
    catalogo.tsx        # Catálogo — placeholder "em breve"
    portal.tsx          # Portal — role-aware (ver abaixo)
    mais.tsx            # Mais — placeholder "em breve"
```

- `portal.tsx`: se `role === 'client'` → mensagem "Portal reservado a artistas agenciados". Se `role === 'artist'` → placeholder com nome do artista (dados reais entram na fase 4).
- Tab bar: ícone + label, ativo em preto, inativo em stone-400 (consistente com o resto do design system).

## Sistema visual (reaproveitado do portal web)

- Cores: preto (#111111/#1a1a1a gradiente em heroes), branco, stone grayscale (stone-50/100/200/400/900).
- Tipografia: Playfair Display (via `expo-font`, com fallback serif do sistema) para títulos grandes; sans-serif para o resto.
- Labels uppercase, tracking largo, cards com borda hairline 1px, sem sombras pesadas.
- Ecrãs `login`/`signup`: fundo preto, wordmark QUIC branco centrado, formulário minimalista.

## Testes

- **Unit/component** (Jest + `@testing-library/react-native`):
  - `resolveUserRole(artistRow, session)` — função pura que decide client vs artist.
  - Formulários login/signup: validação de campos, estados de erro (credenciais inválidas, email já existente).
  - Lógica de redirect do root layout (sessão ausente/presente).
- **Integração DB** (vitest, mesmo padrão já usado no repo, contra Supabase local/projeto de teste):
  - Migration 0041 aplica sem erros; coluna e índice existem.
  - `inviteUserByEmail` + update `auth_user_id` liga corretamente ao artista certo.
  - Policy `artist_read_own_artist`: um artista autenticado só vê a própria row, não as de outros.
- **E2E**: fora de escopo nesta fase (Playwright do repo é web-only; ferramenta mobile tipo Maestro/Detox fica para decisão futura, não é omissão).

## Fora de escopo (fases seguintes)

- Conteúdo real de Início (feed eventos), Catálogo (produtos/stock), Portal (agenda/imprensa/conteúdos/documentos do artista).
- Políticas RLS `artist_read_own_*` nas tabelas de agenda/clippings/assets.
- Recuperação de password / gestão de conta avançada além do fluxo Supabase nativo.
- Contas de organizador/admin na app mobile (dashboard web continua a ser a ferramenta de gestão).
