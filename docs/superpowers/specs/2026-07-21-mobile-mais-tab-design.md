# App mobile Quic: tab "Mais" (perfil, sobre, definições, logout) Design

## Contexto

A tab "Mais" (`mobile/app/(tabs)/mais.tsx`) é hoje um placeholder puro (`PlaceholderScreen` com título "Mais" e mensagem "Sobre, contacto e definições"). É a última das 4 tabs por implementar com dados reais, depois de Início (feed eventos), Catálogo (materiais) e Portal (dados do artista).

Não existe hoje nenhum ecrã de logout ou perfil na app mobile — este é o primeiro.

## Objetivo

Substituir o placeholder por um ecrã funcional com 4 secções: dados do utilizador autenticado, informação estática sobre a app, definições (placeholder, sem funcionalidade real ainda), e terminar sessão.

## Fora de escopo

- Edição de perfil (mudar nome, foto, etc.) — só leitura por agora.
- Definições funcionais (notificações, idioma, etc.) — mostra-se a secção mas sem toggle ativo, label "Em breve".
- Contactos/redes sociais reais da QUIC — só texto fixo (nome da empresa + versão da app), sem links.
- Ecrã de ajuda/suporte, FAQ, ou termos e condições.

## Arquitetura

Ecrã único `mobile/app/(tabs)/mais.tsx`, sem sub-navegação (ao contrário do Portal, que tem tabs internas). Sem fetch novo à base de dados — todos os dados vêm de hooks/funções já existentes:

- `useSession()` (`mobile/hooks/useSession.ts`) — sessão Supabase atual.
- `resolveUserRole(supabase, session)` (`mobile/lib/role.ts`) — já devolve role (`client`/`artist`/`staff`) e, para artistas, o nome; para clientes/staff, o nome vem de `session.user.user_metadata` ou do email como fallback.
- `Constants.expoConfig?.version` (`expo-constants`, já é dependência do projeto) — versão da app, lida de `app.json` (`"version": "1.0.0"`), nunca hardcoded no componente.
- `supabase.auth.signOut()` — logout. Após sucesso, `useSession`'s listener (`onAuthStateChange`) já deteta a mudança e o `_layout.tsx` root (que já faz redirect por sessão) trata da navegação — sem lógica de navegação manual no ecrã.

## Layout (confirmado: opção "lista única com secções")

Consistente com o padrão visual já usado na tab Portal (`portal.tsx`): hero escuro no topo + cards por baixo.

1. **Hero** (`#111111`, padding 24/32): avatar circular com iniciais do nome, nome completo, email + role traduzida ("Cliente"/"Artista"/"Staff") por baixo a cinza claro.
2. **Secção "Sobre"** (label uppercase cinza, depois cards): card 1 = "QUIC — Event Management Platform" (texto fixo), card 2 = "Versão X.X.X" (de `Constants.expoConfig.version`).
3. **Secção "Definições"**: 1 card "Notificações" com texto "Em breve" à direita, sem `onPress` funcional — puramente informativo.
4. **Botão "Terminar sessão"**: destrutivo (fundo `#fef2f2`, texto `#b91c1c`), centrado, no fim do ecrã.

Reutiliza os estilos já definidos em `portal.tsx` onde aplicável (`hero`, `label`, `card`, etc.) — extrair para um ficheiro de estilos partilhado não é necessário para este escopo (só 2 ecrãs a usar o padrão; extrair prematuramente seria over-engineering).

## Interação: terminar sessão

Ao tocar em "Terminar sessão": `Alert.alert` nativo com título "Terminar sessão" e mensagem "Tens a certeza que queres terminar sessão?", botões "Cancelar" (estilo `cancel`) e "Terminar sessão" (estilo `destructive`). Só ao confirmar chama `supabase.auth.signOut()`.

## Tratamento de erros

- `signOut()` falha (raro, mas a chamada pode rejeitar): apanhar o erro e mostrar `Alert.alert('Erro', 'Não foi possível terminar sessão. Tenta novamente.')`. Sem retry automático.
- `resolveUserRole` ainda a carregar (sessão a resolver): mostra `ActivityIndicator` centrado, mesmo padrão do `PortalScreen` (`role === null` → loading).
- Sem estados de erro adicionais: não há fetch de rede novo neste ecrã além do já coberto por `useSession`/`resolveUserRole`, que já tratam os seus próprios erros internamente.

## Testes

Ficheiro: `mobile/__tests__/app/(tabs)/mais.test.tsx` (nunca dentro de `mobile/app/` — regra do projeto, já repetida nos specs anteriores: ficheiros `.test.tsx` sob `app/` quebram `expo export` porque o Expo Router trata qualquer ficheiro em `app/` como rota potencial).

Mocks: `useSession`, `resolveUserRole`, `supabase.auth.signOut`, `Alert.alert` (do `react-native`), `Constants.expoConfig` (de `expo-constants`).

Casos:
1. Mostra nome, email e role traduzida do utilizador autenticado.
2. Mostra a versão da app vinda de `Constants.expoConfig.version`.
3. Toca em "Terminar sessão" → chama `Alert.alert` com título/mensagem de confirmação, ainda não chama `signOut`.
4. Confirma no Alert (simulando o callback do botão destrutivo) → chama `supabase.auth.signOut()`.
5. `signOut()` rejeita → chama `Alert.alert('Erro', ...)`.
