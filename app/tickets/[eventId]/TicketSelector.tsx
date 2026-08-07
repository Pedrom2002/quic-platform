// app/tickets/[eventId]/TicketSelector.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { TicketType } from '@/lib/tickets/tickets'

export function TicketSelector({ eventId, ticketTypes }: { eventId: string; ticketTypes: TicketType[] }) {
  const [selectedId, setSelectedId] = useState(ticketTypes[0]?.id ?? '')
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsLogin, setNeedsLogin] = useState(false)

  async function handleCheckout() {
    setError(null)
    setNeedsLogin(false)
    setLoading(true)
    try {
      const res = await fetch('/api/tickets/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketTypeId: selectedId, quantity, platform: 'web' }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? 'Não foi possível iniciar o pagamento.')
        if (res.status === 401) setNeedsLogin(true)
        setLoading(false)
        return
      }
      const body = await res.json()
      window.location.href = body.url
    } catch {
      setError('Erro de ligação. Tenta novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <div className="space-y-3">
        {ticketTypes.map(tt => (
          <label
            key={tt.id}
            className="flex items-center justify-between rounded-md border border-zinc-800 px-4 py-3 cursor-pointer has-[:checked]:border-zinc-500"
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name="ticketType"
                value={tt.id}
                checked={selectedId === tt.id}
                onChange={() => setSelectedId(tt.id)}
              />
              <span className="text-white text-sm">{tt.name}</span>
            </span>
            <span className="text-zinc-400 text-sm">{(tt.price_cents / 100).toFixed(2)} €</span>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-5">
        <label htmlFor="quantity" className="text-sm text-zinc-400">Quantidade</label>
        <input
          id="quantity"
          type="number"
          min={1}
          max={10}
          value={quantity}
          onChange={e => setQuantity(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
          className="w-16 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-white text-sm"
        />
      </div>

      {error && (
        <div className="mt-4">
          <p className="text-red-400 text-sm">{error}</p>
          {needsLogin && (
            <p className="text-sm mt-1">
              <Link
                href={`/tickets/login?returnTo=${encodeURIComponent(`/tickets/${eventId}`)}`}
                className="text-zinc-300 underline hover:text-zinc-200"
              >
                Entrar para continuar
              </Link>
            </p>
          )}
        </div>
      )}

      <Button onClick={handleCheckout} disabled={loading || !selectedId} className="w-full mt-5">
        {loading ? 'A processar...' : 'Comprar bilhetes'}
      </Button>
    </div>
  )
}
