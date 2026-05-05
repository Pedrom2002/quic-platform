# Portal do Cliente — Redesign Premium

**Goal:** Tornar o portal do cliente visualmente premium e elegante, com animações suaves e um estado especial quando o evento está concluído.

**Tone:** Luxo/editorial. Preto e branco, tipografia grande, espaço, sem excessos.

**Constraints:** Sem novas dependências. Animações via CSS puro + `tw-animate-css` (já instalado) + `@keyframes` inline. Apenas `PortalClient.tsx` é modificado.

---

## Animações de Entrada (Mount)

Ao carregar a página, cada elemento do hero faz **fade-up** escalonado:

- Slogan ("No Stage Is Too Big"): delay 0ms
- Nome do evento: delay 80ms
- Meta (data, venue): delay 160ms
- Progress bar section: delay 240ms

Implementação: classe CSS `animate-fade-up` com `animation-delay` inline. Keyframes definidos via `<style>` tag no componente ou via Tailwind arbitrary.

```css
@keyframes fade-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

Duration: 500ms, easing: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out snappy).

Items da lista (pendentes): fade-in escalonado, delay de 40ms por item, começa após 300ms do mount.

---

## Progress Counter Animado

O número de `%` no hero conta de 0 até ao valor real (~1s, ease-out) usando `useEffect` + `requestAnimationFrame` ou um simples `setInterval` de 16ms.

Fórmula: `displayed = easeOut(t) * target` onde `t` vai de 0 a 1 em ~60 frames.

---

## Transição Realtime: Pendente → Concluído

Quando um item muda de status via Supabase Realtime:

1. O item na lista pendente recebe classe `opacity-0 translate-y-1 transition-all duration-300` (fade-out + slide-up ligeiro)
2. Após 300ms, o estado React é atualizado (move o item para `completedItems`)
3. O item aparece no topo da lista concluída com `fade-in + slide-down` (300ms)
4. Uma pulse verde suave corre 1 ciclo no item recém-concluído (600ms):

```css
@keyframes pulse-green {
  0%   { background-color: rgb(209 250 229); }  /* emerald-100 */
  50%  { background-color: rgb(167 243 208); }  /* emerald-200 */
  100% { background-color: rgb(209 250 229); }  /* emerald-100 */
}
```

`completion_note` aparece com delay 150ms após o item (fade-in separado).

**Estado de animação:** `animatingOut: Set<string>` — IDs de items a sair. `justCompleted: Set<string>` — IDs recém-chegados à lista concluída (para aplicar pulse).

---

## Estado "Evento Concluído"

Quando `status === 'completed'`, entre o hero e a lista de items aparece uma **banda de celebração**:

```
┌─────────────────────────────────────────────┐
│                                             │
│   100%                                      │
│   Evento concluído                          │
│                                             │
│   Obrigado por escolher a Quic.             │
│   Foi um prazer trabalhar convosco.         │
│                                             │
└─────────────────────────────────────────────┘
```

**Estilo:**
- Fundo: `bg-white`, borda superior e inferior `border-stone-100`
- `100%` em `text-7xl sm:text-8xl font-bold tracking-tight text-stone-900`
- "Evento concluído" em `text-xs tracking-widest uppercase text-stone-400`
- Texto de agradecimento em `text-stone-500 text-sm leading-relaxed`
- Fade-in ao montar: `animate-fade-up` com delay 200ms

Esta banda só aparece quando `status === 'completed'`. Quando o evento passa a concluído via realtime (se o portal estiver aberto), a banda aparece com fade-in suave.

---

## Realtime Status Indicator (Footer)

Substitui o "Atualizado · HH'h'mm'min'ss's'" por um indicador mais limpo:

**Estado conectado (sem updates recentes):**
```
● Em direto
```
- Dot verde (`bg-emerald-400`) com CSS animation `pulse-dot` loop infinito (2s):
  ```css
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(1.3); }
  }
  ```

**Após um update realtime:**
```
● Atualizado às 14h32
```
- Dot muda para branco/opaco por 3s, depois volta ao pulse verde

**Estado:** `lastUpdate: Date | null` (já existe). Adicionar `isConnected: boolean` — `true` após o channel `.subscribe()` resolver, `false` se `subscribe()` retornar erro.

---

## Ficheiros Modificados

| Ficheiro | Tipo de mudança |
|---|---|
| `app/portal/[token]/PortalClient.tsx` | Rewrite completo do componente (animações, estado concluído, realtime indicator) |

Ficheiros **não tocados:** `page.tsx`, `lib/portal/data.ts`, `lib/portal/token.ts`.

---

## Não incluído (YAGNI)

- Confetti ou animações de celebração pesadas
- Skeleton loading states
- Partilha social
- Comentários ou feedback do cliente
- Dark mode toggle
