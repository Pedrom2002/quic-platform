// app/tickets/meus-bilhetes/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/server'
import { fetchMyTickets, type MyTicket } from '@/lib/tickets/tickets'

const STATUS_LABELS: Record<string, string> = {
  valid: 'Válido',
  used: 'Utilizado',
  refunded: 'Reembolsado',
}

async function ticketQrDataUrl(ticket: MyTicket): Promise<string> {
  return QRCode.toDataURL(ticket.qr_code, {
    width: 160,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  })
}

export default async function MeusBilhetesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/tickets/login')

  const tickets = await fetchMyTickets(supabase)

  const eventIds = [...new Set(tickets.map(t => t.event_id))]
  const eventNameById = new Map<string, string>()
  if (eventIds.length > 0) {
    const { data: events } = await supabase.from('events').select('id, name').in('id', eventIds)
    for (const e of (events ?? []) as { id: string; name: string }[]) {
      eventNameById.set(e.id, e.name)
    }
  }

  const qrDataUrls = await Promise.all(tickets.map(ticket => ticketQrDataUrl(ticket)))

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-white mb-8">Os Meus Bilhetes</h1>

        {tickets.length === 0 ? (
          <p className="text-zinc-400 text-sm">
            Ainda não tens bilhetes. <Link href="/tickets" className="text-zinc-300 underline">Ver eventos</Link>
          </p>
        ) : (
          <div className="grid gap-4">
            {tickets.map((ticket, index) => (
              <div key={ticket.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 flex items-center gap-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrls[index]} alt="QR code do bilhete" width={80} height={80} className="rounded-md" />
                <div>
                  <p className="text-white font-semibold">{eventNameById.get(ticket.event_id) ?? 'Evento'}</p>
                  <p className="text-zinc-400 text-sm mt-1">{STATUS_LABELS[ticket.status] ?? ticket.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
