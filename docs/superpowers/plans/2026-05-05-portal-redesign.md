# Portal Redesign Premium Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar o portal do cliente premium e elegante com animações CSS suaves, transições realtime elegantes e um estado especial de evento concluído.

**Architecture:** Tudo em `PortalClient.tsx` (Client Component). Animações via CSS `@keyframes` definidos numa `<style>` tag injetada no componente + classes Tailwind arbitrárias. Sem novas dependências. Estado de animação gerido localmente com `useState` + `Set<string>` para tracking de items em transição.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, `tw-animate-css`, Supabase Realtime, TypeScript

---

## File Map

| Ficheiro | Mudança |
|---|---|
| `app/portal/[token]/PortalClient.tsx` | Rewrite completo — animações, estado concluído, realtime indicator |

Nenhum outro ficheiro é tocado.

---

### Task 1: Keyframes CSS + animações de entrada do hero

**Files:**
- Modify: `app/portal/[token]/PortalClient.tsx`

O ficheiro atual começa com `'use client'` e tem imports. A `<style>` tag com os keyframes vai ser injetada dentro do return JSX, antes de tudo o resto.

- [ ] **Step 1: Adicionar `<style>` com keyframes e classes de animação**

No `return (...)` do componente, como primeiro elemento dentro do `<div className="min-h-screen bg-white">`, adicionar:

```tsx
<style>{`
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%      { opacity: 0.4; transform: scale(1.35); }
  }
  @keyframes pulse-green {
    0%, 100% { background-color: rgb(209 250 229); border-color: rgb(167 243 208); }
    50%      { background-color: rgb(167 243 208); border-color: rgb(110 231 183); }
  }
  @keyframes count-up {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .anim-fade-up {
    animation: fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .anim-fade-in {
    animation: fade-in 0.4s ease-out both;
  }
  .anim-pulse-green {
    animation: pulse-green 0.6s ease-in-out 1;
  }
  .anim-item-exit {
    opacity: 0;
    transform: translateY(-6px);
    transition: opacity 0.25s ease-out, transform 0.25s ease-out;
  }
  .anim-item-enter {
    animation: fade-up 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
`}</style>
```

- [ ] **Step 2: Aplicar `anim-fade-up` com delays escalonados nos elementos do hero**

Substituir o bloco interno da `<section>` do hero (o `<div className="w-full max-w-5xl...">`) para adicionar classes de animação:

```tsx
<div className="w-full max-w-5xl mx-auto px-5 sm:px-8 md:px-12 pt-8 sm:pt-12 pb-16 sm:pb-24 md:pb-32">
  {/* Top bar */}
  <div className="flex items-center justify-between mb-16 sm:mb-24 md:mb-32 anim-fade-up" style={{ animationDelay: '0ms' }}>
    <Image src="/logo-branco.png" alt="Quic" width={80} height={32} priority />
    <StatusBadge status={status} />
  </div>

  {/* Slogan */}
  <p className="text-xs font-medium tracking-[0.35em] uppercase text-white/40 mb-5 anim-fade-up" style={{ animationDelay: '80ms' }}>
    No Stage Is Too Big
  </p>

  {/* Event name */}
  <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-8 break-words hyphens-auto anim-fade-up" style={{ animationDelay: '160ms' }}>
    {eventName}
  </h1>

  {/* Meta */}
  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-white/50 text-sm anim-fade-up" style={{ animationDelay: '240ms' }}>
    <span>{eventDate}</span>
    {venueName && (
      <>
        <span className="w-px h-3 bg-white/20" />
        <span>{venueName}</span>
      </>
    )}
  </div>
</div>
```

Nota: `StatusBadge` é um componente inline definido na Task 2.

- [ ] **Step 3: Aplicar `anim-fade-up` com delay na secção da progress bar**

Na `<div className="border-t border-white/10">` (progress bar section), adicionar `anim-fade-up` com delay 320ms:

```tsx
<div className="border-t border-white/10 anim-fade-up" style={{ animationDelay: '320ms' }}>
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: zero erros.

- [ ] **Step 5: Commit**

```bash
git add "app/portal/[token]/PortalClient.tsx"
git commit -m "feat: add CSS keyframes and hero fade-up entrance animations"
```

---

### Task 2: StatusBadge + Progress Counter animado

**Files:**
- Modify: `app/portal/[token]/PortalClient.tsx`

- [ ] **Step 1: Adicionar hook `useCountUp` para animar o número de `%`**

Adicionar este hook acima do componente `PortalClient` (após os imports):

```tsx
function useCountUp(target: number, duration = 900): number {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    if (target === 0) { setDisplayed(0); return }
    const start = performance.now()
    let raf: number
    function step(now: number) {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setDisplayed(Math.round(eased * target))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return displayed
}
```

- [ ] **Step 2: Usar `useCountUp` no componente**

Dentro de `PortalClient`, antes do `return`:

```tsx
const displayedPercent = useCountUp(progress.percent)
```

Substituir `{progress.percent}` no hero pela variável animada:

```tsx
<span className="text-3xl sm:text-4xl font-bold tracking-tight">{displayedPercent}</span>
```

- [ ] **Step 3: Adicionar componente `StatusBadge` inline**

Adicionar esta função acima de `PortalClient` (após `useCountUp`):

```tsx
function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return (
      <span className="text-xs font-medium tracking-widest uppercase text-emerald-400 border border-emerald-400/40 px-3 py-1">
        Concluído
      </span>
    )
  }
  if (status === 'active') {
    return (
      <span className="text-xs font-medium tracking-widest uppercase text-white/70 border border-white/20 px-3 py-1">
        Em Curso
      </span>
    )
  }
  return (
    <span className="text-xs font-medium tracking-widest uppercase text-white/70 border border-white/20 px-3 py-1">
      Em Preparação
    </span>
  )
}
```

Remover o badge hardcoded `"Em Preparação"` que existia antes no top bar e usar `<StatusBadge status={status} />`.

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: zero erros.

- [ ] **Step 5: Commit**

```bash
git add "app/portal/[token]/PortalClient.tsx"
git commit -m "feat: animated percent counter and dynamic status badge"
```

---

### Task 3: Banda de celebração "Evento Concluído"

**Files:**
- Modify: `app/portal/[token]/PortalClient.tsx`

Esta banda aparece entre o hero e a secção de content quando `status === 'completed'`.

- [ ] **Step 1: Adicionar a banda no JSX, entre `</section>` (hero) e `<section>` (content)**

```tsx
{status === 'completed' && (
  <div className="border-y border-stone-100 anim-fade-up" style={{ animationDelay: '200ms' }}>
    <div className="w-full max-w-5xl mx-auto px-5 sm:px-8 md:px-12 py-12 sm:py-16">
      <p className="text-xs font-medium tracking-widest uppercase text-stone-400 mb-4">
        Evento concluído
      </p>
      <p className="text-7xl sm:text-8xl font-bold tracking-tight text-stone-900 leading-none mb-8">
        100%
      </p>
      <p className="text-stone-500 text-sm leading-relaxed max-w-sm">
        Obrigado por escolher a Quic.<br />
        Foi um prazer trabalhar convosco.
      </p>
    </div>
  </div>
)}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: zero erros.

- [ ] **Step 3: Commit**

```bash
git add "app/portal/[token]/PortalClient.tsx"
git commit -m "feat: completed event celebration band"
```

---

### Task 4: Fade-in escalonado da lista de items

**Files:**
- Modify: `app/portal/[token]/PortalClient.tsx`

- [ ] **Step 1: Aplicar `anim-fade-in` com delay escalonado nos items pendentes**

Na secção de `pendingItems`, alterar o `<li>` para incluir animação escalonada:

```tsx
{pendingItems.map((item, idx) => (
  <li
    key={item.id}
    className="flex flex-col sm:grid sm:grid-cols-[2rem_1fr] gap-2 sm:gap-6 md:gap-10 py-5 sm:py-6 border-b border-stone-100 last:border-0 anim-fade-in"
    style={{ animationDelay: `${300 + idx * 40}ms` }}
  >
    <span className="text-xs text-stone-400 tabular-nums tracking-wider font-medium pt-0.5">
      {String(idx + 1).padStart(2, '0')}
    </span>
    <p className="text-stone-500 text-base sm:text-lg tracking-tight">
      {item.client_label ?? item.title}
    </p>
  </li>
))}
```

- [ ] **Step 2: Aplicar `anim-fade-in` com delay escalonado nos items concluídos**

Na secção de `completedItems`, alterar o `<li>` para incluir animação escalonada:

```tsx
{completedItems.map((item, idx) => (
  <li
    key={item.id}
    className={`flex flex-col sm:grid sm:grid-cols-[2rem_1fr_auto] gap-2 sm:gap-6 md:gap-10 py-5 sm:py-6 px-4 -mx-4 rounded-lg bg-emerald-100 border border-emerald-300 last:border-0 mb-2 anim-fade-in`}
    style={{ animationDelay: `${300 + idx * 40}ms` }}
  >
    <span className="text-xs text-stone-500 tabular-nums tracking-wider font-medium pt-0.5">
      {String(idx + 1).padStart(2, '0')}
    </span>
    <div>
      <p className="text-stone-900 text-base sm:text-lg font-medium tracking-tight">
        {item.client_label ?? item.title}
      </p>
      {item.completion_note && (
        <p className="text-stone-500 text-sm mt-1.5 leading-relaxed anim-fade-in" style={{ animationDelay: `${300 + idx * 40 + 150}ms` }}>
          {item.completion_note}
        </p>
      )}
    </div>
    {item.completed_at && (
      <span className="text-xs text-stone-400 tabular-nums whitespace-nowrap self-start sm:text-right">
        {format(new Date(item.completed_at), "d MMM · HH'h'mm", { locale: pt })}
      </span>
    )}
  </li>
))}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: zero erros.

- [ ] **Step 4: Commit**

```bash
git add "app/portal/[token]/PortalClient.tsx"
git commit -m "feat: staggered fade-in on checklist items"
```

---

### Task 5: Transição realtime elegante (pendente → concluído)

**Files:**
- Modify: `app/portal/[token]/PortalClient.tsx`

Esta task substitui a lógica do `useEffect` do Supabase Realtime para fazer a transição animada: fade-out do item pendente, depois aparece na lista concluída com pulse verde.

- [ ] **Step 1: Adicionar estado de animação ao componente**

Dentro de `PortalClient`, adicionar dois novos estados após os existentes:

```tsx
const [animatingOut, setAnimatingOut] = useState<Set<string>>(new Set())
const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set())
```

- [ ] **Step 2: Substituir a lógica do handler Supabase Realtime**

O `useEffect` atual faz `setItems` diretamente. Substituir o bloco dentro de `.on(... (payload) => { ... })` por:

```tsx
(payload) => {
  const updated = payload.new as PortalItem & { is_client_visible?: boolean }
  if (updated.is_client_visible === false) return

  // Se o item passou a 'completed', animar a saída primeiro
  if (updated.status === 'completed') {
    setAnimatingOut(prev => new Set(prev).add(updated.id))

    setTimeout(() => {
      setItems(prev => {
        const idx = prev.findIndex(i => i.id === updated.id)
        if (idx === -1) return prev
        const next = [...prev]
        next[idx] = { ...next[idx], ...updated }

        const total = next.length
        const completed = next.filter(i => i.status === 'completed').length
        setProgress({ total, completed, percent: calcProgress(completed, total) })
        return next
      })

      setAnimatingOut(prev => {
        const s = new Set(prev)
        s.delete(updated.id)
        return s
      })

      setJustCompleted(prev => new Set(prev).add(updated.id))

      // Remover o pulse verde após 700ms
      setTimeout(() => {
        setJustCompleted(prev => {
          const s = new Set(prev)
          s.delete(updated.id)
          return s
        })
      }, 700)
    }, 280)
  } else {
    // Para outros updates (ex: nota adicionada), atualizar diretamente
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === updated.id)
      if (idx === -1) return prev
      const next = [...prev]
      next[idx] = { ...next[idx], ...updated }
      return next
    })
  }

  setLastUpdate(new Date())
}
```

- [ ] **Step 3: Aplicar classes de animação condicionais nos items**

Na lista de `pendingItems`, o `<li>` precisa de aplicar `anim-item-exit` quando o item está em `animatingOut`:

```tsx
{pendingItems.map((item, idx) => (
  <li
    key={item.id}
    className={`flex flex-col sm:grid sm:grid-cols-[2rem_1fr] gap-2 sm:gap-6 md:gap-10 py-5 sm:py-6 border-b border-stone-100 last:border-0 anim-fade-in ${animatingOut.has(item.id) ? 'anim-item-exit' : ''}`}
    style={{ animationDelay: `${300 + idx * 40}ms` }}
  >
    <span className="text-xs text-stone-400 tabular-nums tracking-wider font-medium pt-0.5">
      {String(idx + 1).padStart(2, '0')}
    </span>
    <p className="text-stone-500 text-base sm:text-lg tracking-tight">
      {item.client_label ?? item.title}
    </p>
  </li>
))}
```

Na lista de `completedItems`, o `<li>` aplica `anim-item-enter anim-pulse-green` quando está em `justCompleted`, caso contrário `anim-fade-in`:

```tsx
{completedItems.map((item, idx) => {
  const isNew = justCompleted.has(item.id)
  return (
    <li
      key={item.id}
      className={`flex flex-col sm:grid sm:grid-cols-[2rem_1fr_auto] gap-2 sm:gap-6 md:gap-10 py-5 sm:py-6 px-4 -mx-4 rounded-lg border last:border-0 mb-2 ${isNew ? 'anim-item-enter anim-pulse-green border-emerald-300' : 'bg-emerald-100 border-emerald-300 anim-fade-in'}`}
      style={isNew ? undefined : { animationDelay: `${300 + idx * 40}ms` }}
    >
      <span className="text-xs text-stone-500 tabular-nums tracking-wider font-medium pt-0.5">
        {String(idx + 1).padStart(2, '0')}
      </span>
      <div>
        <p className="text-stone-900 text-base sm:text-lg font-medium tracking-tight">
          {item.client_label ?? item.title}
        </p>
        {item.completion_note && (
          <p className="text-stone-500 text-sm mt-1.5 leading-relaxed anim-fade-in" style={{ animationDelay: '150ms' }}>
            {item.completion_note}
          </p>
        )}
      </div>
      {item.completed_at && (
        <span className="text-xs text-stone-400 tabular-nums whitespace-nowrap self-start sm:text-right">
          {format(new Date(item.completed_at), "d MMM · HH'h'mm", { locale: pt })}
        </span>
      )}
    </li>
  )
})}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: zero erros.

- [ ] **Step 5: Commit**

```bash
git add "app/portal/[token]/PortalClient.tsx"
git commit -m "feat: animated realtime transition pending -> completed with pulse"
```

---

### Task 6: Realtime status indicator no footer

**Files:**
- Modify: `app/portal/[token]/PortalClient.tsx`

- [ ] **Step 1: Adicionar estado `isConnected`**

Dentro de `PortalClient`, após os estados existentes:

```tsx
const [isConnected, setIsConnected] = useState(false)
```

- [ ] **Step 2: Atualizar `isConnected` no subscribe**

No `useEffect` do Supabase, após `.subscribe()`, adicionar callback de status:

```tsx
const channel = supabase
  .channel(`portal:${eventId}`)
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'event_checklist_items', filter: `event_id=eq.${eventId}` },
    (payload) => {
      // ... handler existente (da Task 5)
    }
  )
  .subscribe((status) => {
    setIsConnected(status === 'SUBSCRIBED')
  })
```

- [ ] **Step 3: Substituir o bloco do footer pelo novo realtime indicator**

Substituir o bloco `<div className="text-right">` no footer:

```tsx
<div className="text-right flex items-center gap-2 justify-end">
  {isConnected ? (
    <>
      <span
        className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
        style={{ animation: lastUpdate ? 'none' : 'pulse-dot 2s ease-in-out infinite' }}
      />
      <div className="text-right">
        {lastUpdate ? (
          <p className="text-[10px] text-white/40 tabular-nums">
            Atualizado às {format(lastUpdate, "HH'h'mm", { locale: pt })}
          </p>
        ) : (
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/40">
            Em direto
          </p>
        )}
      </div>
    </>
  ) : (
    <p className="text-[10px] tracking-[0.25em] uppercase text-white/40">
      Portal Exclusivo · Tempo Real
    </p>
  )}
</div>
```

- [ ] **Step 4: Remover a linha `"Portal Exclusivo · Tempo Real"` hardcoded** que existia antes (já substituída no step anterior).

- [ ] **Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: zero erros.

- [ ] **Step 6: Commit e push**

```bash
git add "app/portal/[token]/PortalClient.tsx"
git commit -m "feat: live connection indicator in portal footer"
git push origin master
```

---

## Self-Review

**Spec coverage:**
- Animações de entrada do hero (fade-up escalonado) → Task 1, Step 2
- Progress counter animado → Task 2, Step 1-2
- StatusBadge dinâmico → Task 2, Step 3
- Banda de celebração "Evento Concluído" → Task 3
- Fade-in escalonado da lista de items → Task 4
- Transição realtime elegante pendente → concluído → Task 5
- Pulse verde no item recém-concluído → Task 5, Step 3
- Realtime status indicator no footer → Task 6

**Placeholder scan:** Nenhum TBD, TODO, ou "implement later" encontrado.

**Type consistency:** `PortalItem`, `animatingOut: Set<string>`, `justCompleted: Set<string>`, `isConnected: boolean`, `lastUpdate: Date | null` — todos consistentes entre tasks.

**Nota de implementação:** As Tasks devem ser executadas em ordem (1→2→3→4→5→6) pois cada uma constrói sobre a anterior. Em particular: Task 5 depende dos keyframes da Task 1 (`anim-item-exit`, `anim-item-enter`, `anim-pulse-green`) e do estado de animação adicionado na Task 5 step 1.
