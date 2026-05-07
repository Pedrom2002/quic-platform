'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import type { EventTeamAssignmentWithMember } from '@/types/app'
import { loadEventTeamAction, assignTeamMemberAction, removeTeamMemberAction } from './actions'

const roleColors: Record<string, string> = {
  admin: 'bg-red-50 text-red-700 border-red-200',
  manager: 'bg-blue-50 text-blue-700 border-blue-200',
  member: 'bg-slate-50 text-slate-600 border-slate-200',
}

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  member: 'Membro',
}

export default function EventTeamPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId

  const [assignments, setAssignments] = useState<EventTeamAssignmentWithMember[]>([])
  const [orgMembers, setOrgMembers] = useState<{ id: string; full_name: string; email: string; role: string; avatar_url: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [roleInEvent, setRoleInEvent] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => { loadData() }, [eventId])

  async function loadData() {
    setLoading(true)
    try {
      const { assignments: a, orgMembers: m } = await loadEventTeamAction(eventId)
      setAssignments(a)
      setOrgMembers(m)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar equipa')
    } finally {
      setLoading(false)
    }
  }

  function assignMember() {
    if (!selectedMemberId) return
    startTransition(async () => {
      try {
        await assignTeamMemberAction(eventId, selectedMemberId, roleInEvent || undefined)
        toast.success('Membro adicionado à equipa')
        setOpen(false)
        setSelectedMemberId('')
        setRoleInEvent('')
        await loadData()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      }
    })
  }

  function removeMember(assignmentId: string) {
    startTransition(async () => {
      try {
        await removeTeamMemberAction(eventId, assignmentId)
        toast.success('Membro removido')
        setAssignments(prev => prev.filter(a => a.id !== assignmentId))
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      }
    })
  }

  const assignedIds = new Set(assignments.map(a => a.team_member_id))
  const availableMembers = orgMembers.filter(m => !assignedIds.has(m.id))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Equipa do Evento</h1>
          <p className="text-slate-500 mt-1">Membros atribuídos a este evento</p>
        </div>
        {availableMembers.length > 0 && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />Adicionar Membro
          </Button>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-white border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-900">Adicionar à Equipa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="text-slate-700">Membro</Label>
                <Select onValueChange={(val: string | null) => { if (val) setSelectedMemberId(val) }}>
                  <SelectTrigger className="bg-white border-slate-200 text-slate-800">
                    <SelectValue placeholder="Selecionar membro..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name} / {roleLabels[m.role] ?? m.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700">Papel no evento (opcional)</Label>
                <Input
                  value={roleInEvent}
                  onChange={e => setRoleInEvent(e.target.value)}
                  placeholder="ex: Coordenador, Fotografo..."
                />
              </div>
              <Button
                onClick={assignMember}
                disabled={!selectedMemberId || isPending}
                className="w-full"
              >
                Adicionar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-slate-400">A carregar...</p>
      ) : !assignments.length ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">Nenhum membro atribuído a este evento.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
          {assignments.map(a => {
            const tm = a.team_member
            const initials = tm.full_name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('')
            return (
              <div key={a.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <span className="text-slate-600 text-sm font-semibold">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-slate-800 font-medium">{tm.full_name}</p>
                    <span className={`text-xs border px-1.5 py-0.5 rounded ${roleColors[tm.role] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {roleLabels[tm.role] ?? tm.role}
                    </span>
                    {a.role_in_event && (
                      <span className="text-xs text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded">
                        {a.role_in_event}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5">{tm.email}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeMember(a.id)}
                  disabled={isPending}
                  className="text-slate-300 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
