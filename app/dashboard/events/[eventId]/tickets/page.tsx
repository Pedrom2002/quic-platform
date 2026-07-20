import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { TicketTypeForm } from './ticket-type-form'
import { TicketTypeRowActions } from './ticket-type-row-actions'

export default async function TicketTypesPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('ticket_types')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at')

  const ticketTypes = data ?? []

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <Link href={`/dashboard/events/${eventId}`} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-4 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> Voltar ao evento
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Tipos de bilhete</h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Novo tipo de bilhete</h2>
        <TicketTypeForm eventId={eventId} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Vendidos</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-32 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ticketTypes.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Sem tipos de bilhete.
              </TableCell>
            </TableRow>
          )}
          {ticketTypes.map(tt => (
            <TableRow key={tt.id}>
              <TableCell className="font-medium">{tt.name}</TableCell>
              <TableCell>{(tt.price_cents / 100).toFixed(2)} €</TableCell>
              <TableCell>{tt.quantity_sold}</TableCell>
              <TableCell>{tt.quantity_total}</TableCell>
              <TableCell>{tt.is_active ? 'Ativo' : 'Inativo'}</TableCell>
              <TableCell className="text-right">
                <TicketTypeRowActions eventId={eventId} ticketType={tt} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
