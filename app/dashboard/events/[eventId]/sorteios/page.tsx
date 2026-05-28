import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { RaffleBoard } from '@/components/events/RaffleBoard'
import { loadRafflesAction } from './actions'

export default async function SorteiosPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()

  const [{ data: { user } }, { data: event }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('events').select('id, name').eq('id', eventId).single(),
  ])

  if (!user) redirect('/auth/login')
  if (!event) notFound()

  const raffles = await loadRafflesAction(eventId)

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/dashboard/events/${eventId}`}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-4 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> {event.name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Sorteios</h1>
        <p className="text-slate-500 mt-1">Gestão e operação de sorteios no evento.</p>
      </div>

      <RaffleBoard eventId={eventId} initialRaffles={raffles} />
    </div>
  )
}
