// app/tickets/success/SuccessPoller.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { fetchTicketsBySession, type MyTicket } from '@/lib/tickets/tickets'

const POLL_INTERVAL_MS = 2000
const MAX_ATTEMPTS = 15

type PollState =
  | { status: 'polling' }
  | { status: 'found'; tickets: MyTicket[] }
  | { status: 'pending' }
  | { status: 'error' }

export function SuccessPoller({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<PollState>({ status: 'polling' })

  useEffect(() => {
    let attempts = 0
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const supabase = createClient()

    async function poll() {
      attempts += 1
      const result = await fetchTicketsBySession(supabase, sessionId)
      if (cancelled) return

      if (result.error) {
        setState({ status: 'error' })
        return
      }
      if (result.tickets.length > 0) {
        setState({ status: 'found', tickets: result.tickets })
        return
      }
      if (attempts >= MAX_ATTEMPTS) {
        setState({ status: 'pending' })
        return
      }
      timeoutId = setTimeout(poll, POLL_INTERVAL_MS)
    }

    poll()
    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [sessionId])

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        {state.status === 'polling' && <p className="text-zinc-400 text-sm">A confirmar o teu pagamento...</p>}
        {state.status === 'error' && <p className="text-red-400 text-sm">Não foi possível confirmar o pagamento. Contacta o suporte.</p>}
        {state.status === 'pending' && (
          <p className="text-zinc-400 text-sm">
            O pagamento foi recebido mas os bilhetes ainda estão a ser processados.
            Consulta <Link href="/tickets/meus-bilhetes" className="text-zinc-300 underline">os teus bilhetes</Link> dentro de instantes.
          </p>
        )}
        {state.status === 'found' && (
          <>
            <p className="text-white text-lg font-semibold mb-2">Compra confirmada!</p>
            <p className="text-zinc-400 text-sm mb-6">{state.tickets.length} bilhete(s) adicionados à tua conta.</p>
            <Link href="/tickets/meus-bilhetes" className="text-zinc-300 underline text-sm">Ver os meus bilhetes</Link>
          </>
        )}
      </div>
    </div>
  )
}
