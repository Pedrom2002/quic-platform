# App mobile Quic: redesign do login com vídeo de fundo Design

## Contexto

O ecrã de login (`mobile/app/login.tsx`) é hoje um fundo sólido escuro (`#111111`) com wordmark "QUIC" + tagline centrados, seguidos do formulário. Existe um vídeo institucional (`intro_2_109.mp4`, 10.3MB, já em `public/` do site) que já contém a marca QUIC visualmente.

## Objetivo

Substituir o fundo sólido por este vídeo em loop, remover o texto "QUIC" duplicado, e reposicionar o formulário para a parte inferior do ecrã com gradiente para legibilidade.

## Fora de escopo

- Redesign do signup.
- Compressão do vídeo.
- Fallback de imagem estática se o vídeo falhar.

## Dependência nova

`expo-video` (`npx expo install expo-video`). API: `useVideoPlayer(source, setupFn)` + `<VideoView player={player} nativeControls={false} contentFit="cover" />`. `expo-linear-gradient` já instalada.

## Ficheiro de vídeo

Copiar `public/intro_2_109.mp4` para `mobile/assets/videos/intro_2_109.mp4` (projetos separados, mobile não acede a `public/` do Next.js).

## Arquitetura (`mobile/app/login.tsx`)

- `useVideoPlayer(require('../assets/videos/intro_2_109.mp4'), player => { player.loop = true; player.muted = true; player.play() })`.
- `<VideoView>` preenche o ecrã (`position: absolute` fill), `contentFit="cover"`, `nativeControls={false}`.
- `<LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} locations={[0, 0.7]}>` sobreposto, fill.
- Remove wordmark/tagline do JSX e estilos.
- Form (inputs, botão, link) passa de centrado para ancorado em baixo: `position: absolute`, `bottom: insets.bottom + 24`, `left/right: 24`, via `useSafeAreaInsets()`.
- Estilos dos inputs/botão mantêm-se (já são "glass" sobre fundo escuro).

## Tratamento de erros

Nenhum novo — lógica de `handleLogin`/`supabase.auth.signInWithPassword` inalterada.

## Testes

`mobile/__tests__/app/login.test.tsx` deve continuar a passar sem mudança de asserções (confirmar nenhuma depende do texto removido). Precisa de mocks novos: `expo-video` (`useVideoPlayer`, `VideoView`) e `react-native-safe-area-context` (`useSafeAreaInsets`, padrão já estabelecido noutros ecrãs).
