'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Users, Trophy, Shuffle, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { EventRaffleWithEntries, EventRaffleEntry } from '@/types/app'
import {
  createRaffleAction,
  deleteRaffleAction,
  addEntryAction,
  addEntriesBulkAction,
  drawWinnerAction,
} from '@/app/dashboard/events/[eventId]/sorteios/actions'

interface RaffleBoardProps {
  eventId: string
  initialRaffles: EventRaffleWithEntries[]
}

export function RaffleBoard({ eventId, initialRaffles }: RaffleBoardProps) {
  const [raffles, setRaffles] = useState<EventRaffleWithEntries[]>(initialRaffles)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPrize, setNewPrize] = useState('')
  const [creating, setCreating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newParticipant, setNewParticipant] = useState<Record<string, string>>({})
  const [addingEntry, setAddingEntry] = useState<string | null>(null)
  const [drawing, setDrawing] = useState<string | null>(null)
  const [bulkText, setBulkText] = useState<Record<string, string>>({})
  const [showBulk, setShowBulk] = useState<string | null>(null)
  const [addingBulk, setAddingBulk] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleCreate() {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const raffle = await createRaffleAction(eventId, { title: newTitle, prize: newPrize })
      setRaffles(prev => [...prev, { ...raffle, entries: [] }])
      setNewTitle('')
      setNewPrize('')
      setShowNewForm(false)
      toast.success('Sorteio criado')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(raffleId: string) {
    try {
      await deleteRaffleAction(raffleId)
      setRaffles(prev => prev.filter(r => r.id !== raffleId))
      toast.success('Sorteio eliminado')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    }
  }

  async function handleAddEntry(raffleId: string) {
    const name = newParticipant[raffleId]?.trim()
    if (!name) return
    setAddingEntry(raffleId)
    try {
      const entry = await addEntryAction(raffleId, name)
      setRaffles(prev => prev.map(r =>
        r.id === raffleId ? { ...r, entries: [...r.entries, entry] } : r
      ))
      setNewParticipant(prev => ({ ...prev, [raffleId]: '' }))
      toast.success('Participante adicionado')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setAddingEntry(null)
    }
  }

  async function handleBulkAdd(raffleId: string) {
    const text = bulkText[raffleId] ?? ''
    const names = text.split('\n').map(n => n.trim()).filter(n => n.length > 0)
    if (!names.length) return
    setAddingBulk(raffleId)
    try {
      const count = await addEntriesBulkAction(raffleId, names)
      const newEntries: EventRaffleEntry[] = names.map((participant_name, i) => ({
        id: `temp-${Date.now()}-${i}`,
        raffle_id: raffleId,
        organization_id: '',
        participant_name,
        is_winner: false,
        drawn_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))
      setRaffles(prev => prev.map(r =>
        r.id === raffleId ? { ...r, entries: [...r.entries, ...newEntries] } : r
      ))
      setBulkText(prev => ({ ...prev, [raffleId]: '' }))
      setShowBulk(null)
      toast.success(`${count} participantes adicionados`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setAddingBulk(null)
    }
  }

  async function handleDraw(raffleId: string) {
    setDrawing(raffleId)
    try {
      const winner = await drawWinnerAction(raffleId)
      setRaffles(prev => prev.map(r => {
        if (r.id !== raffleId) return r
        return {
          ...r,
          status: 'completed',
          drawn_at: winner.drawn_at,
          entries: r.entries.map(e => ({
            ...e,
            is_winner: e.id === winner.id,
            drawn_at: e.id === winner.id ? winner.drawn_at : null,
          })),
        }
      }))
      toast.success(`Vencedor: ${winner.participant_name}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setDrawing(null)
    }
  }

  async function handleCSV(raffleId: string, file: File) {
    const text = await file.text()
    const names = text.split(/[\n,]/).map(n => n.trim()).filter(n => n.length > 0)
    if (!names.length) { toast.error('Ficheiro vazio ou formato inválido'); return }
    setAddingBulk(raffleId)
    try {
      const count = await addEntriesBulkAction(raffleId, names)
      const newEntries: EventRaffleEntry[] = names.map((participant_name, i) => ({
        id: `temp-${Date.now()}-${i}`,
        raffle_id: raffleId,
        organization_id: '',
        participant_name,
        is_winner: false,
        drawn_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))
      setRaffles(prev => prev.map(r =>
        r.id === raffleId ? { ...r, entries: [...r.entries, ...newEntries] } : r
      ))
      toast.success(`${count} participantes importados do CSV`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setAddingBulk(null)
    }
  }

  const statusLabel: Record<string, string> = { draft: 'Rascunho', active: 'Activo', completed: 'Concluído' }
  const statusColor: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    active: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
  }

  return (
    <div>
      {/* New raffle button */}
      <div className="mb-4">
        {showNewForm ? (
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3">
            <input
              autoFocus
              type="text"
              placeholder="Nome do sorteio *"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <input
              type="text"
              placeholder="Prémio (opcional)"
              value={newPrize}
              onChange={e => setNewPrize(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setShowNewForm(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleCreate} disabled={creating || !newTitle.trim()}>
                {creating ? 'A criar...' : 'Criar Sorteio'}
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 border border-dashed border-slate-200 hover:border-slate-300 rounded-xl bg-white hover:bg-slate-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Criar novo sorteio
          </button>
        )}
      </div>

      {/* Raffle list */}
      {!raffles.length && (
        <p className="text-center text-sm text-slate-400 py-12">Nenhum sorteio criado ainda.</p>
      )}

      <div className="space-y-4">
        {raffles.map(raffle => {
          const winner = raffle.entries.find(e => e.is_winner)
          const isExpanded = expandedId === raffle.id

          return (
            <div key={raffle.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              {/* Raffle header */}
              <div className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 text-sm truncate">{raffle.title}</h3>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusColor[raffle.status]}`}>
                      {statusLabel[raffle.status]}
                    </span>
                  </div>
                  {raffle.prize && (
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Trophy className="w-3 h-3" /> {raffle.prize}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <Users className="w-3 h-3" /> {raffle.entries.length} participante{raffle.entries.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
                    onClick={() => setExpandedId(isExpanded ? null : raffle.id)}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDraw(raffle.id)}
                    disabled={drawing === raffle.id || raffle.entries.length === 0}
                    className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-500 text-white border-0"
                  >
                    <Shuffle className="w-3.5 h-3.5 mr-1" />
                    {drawing === raffle.id ? 'A sortear...' : 'Sortear'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-slate-300 hover:text-red-500"
                    onClick={() => handleDelete(raffle.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Winner banner */}
              {winner && (
                <div className="mx-4 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-sm font-semibold text-amber-800">Vencedor: {winner.participant_name}</span>
                </div>
              )}

              {/* Expanded: participants */}
              {isExpanded && (
                <div className="border-t border-slate-100 p-4 space-y-3">
                  {/* Add single */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nome do participante"
                      value={newParticipant[raffle.id] ?? ''}
                      onChange={e => setNewParticipant(prev => ({ ...prev, [raffle.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleAddEntry(raffle.id)}
                      className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAddEntry(raffle.id)}
                      disabled={addingEntry === raffle.id || !newParticipant[raffle.id]?.trim()}
                      className="h-8"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Bulk / CSV actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowBulk(showBulk === raffle.id ? null : raffle.id)}
                      className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2"
                    >
                      Adicionar em bloco
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2"
                    >
                      Importar CSV
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleCSV(raffle.id, file)
                        e.target.value = ''
                      }}
                    />
                  </div>

                  {showBulk === raffle.id && (
                    <div className="space-y-2">
                      <textarea
                        rows={4}
                        placeholder="Um nome por linha"
                        value={bulkText[raffle.id] ?? ''}
                        onChange={e => setBulkText(prev => ({ ...prev, [raffle.id]: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setShowBulk(null)}>Cancelar</Button>
                        <Button
                          size="sm"
                          onClick={() => handleBulkAdd(raffle.id)}
                          disabled={addingBulk === raffle.id || !bulkText[raffle.id]?.trim()}
                        >
                          {addingBulk === raffle.id ? 'A adicionar...' : 'Adicionar'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Participant list */}
                  {raffle.entries.length > 0 && (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {raffle.entries.map(entry => (
                        <div
                          key={entry.id}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                            entry.is_winner
                              ? 'bg-amber-50 border border-amber-200 text-amber-800 font-semibold'
                              : 'bg-slate-50 text-slate-700'
                          }`}
                        >
                          {entry.is_winner && <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                          <span className="flex-1 truncate">{entry.participant_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
