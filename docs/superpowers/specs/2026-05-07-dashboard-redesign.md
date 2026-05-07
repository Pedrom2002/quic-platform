# Dashboard Redesign — Editorial Premium

## Goal

Redesign `app/dashboard/page.tsx` to an editorial premium style: dark gradient header with integrated KPIs and greeting, light body with event/notification cards.

## Architecture

Single file change: `app/dashboard/page.tsx`. No new components. Data fetching unchanged.

## Visual Design

### Header (dark)
- Background: `linear-gradient(135deg, #111111 0%, #1a1a1a 100%)`
- Top row: logo (`/Design sem nome(1).png`, 120x48) left + "Novo evento" button right (white bg, black text)
- Greeting row: serif font (`font-playfair`), large ("Boa tarde, Pedro"), with date + active event count subtitle below
- KPI strip: 3 KPIs inline, separated by `border-r border-white/10`, bottom-aligned to header
  - Ativos / Etapas concluídas hoje / Clientes registados
  - Number: `text-2xl font-bold text-white`
  - Label: `text-[10px] uppercase tracking-widest text-white/40`

### Body
- Background: `#f5f5f5`
- Padding: `px-8 py-8 max-w-5xl mx-auto`
- Grid: `grid-cols-5 gap-6` — events col-span-3, notifications col-span-2

### Urgency Alert
- Kept but restyled: `bg-amber-50 border border-amber-200 rounded-xl` with amber accent
- Shown above events card only when events need attention

### Events Card
- White bg, `border border-stone-200 rounded-xl shadow-sm`
- Header row: "Eventos em curso" label + "Ver todos" link
- Each row: colored dot + event name + date + status badge
- Empty state: calendar icon + CTA

### Notifications Card
- White bg, same style as events card
- Each item: status icon (green check / red alert) + client name + subject + timestamp
- Empty state: "Sem atividade recente"

### Status Badges
- Active: `bg-emerald-50 text-emerald-700`
- Planning: `bg-amber-50 text-amber-700`
- Urgent countdown: `text-orange-500 font-medium`

## Data

No changes to data fetching. All existing queries remain identical.

## Files

- Modify: `app/dashboard/page.tsx`
