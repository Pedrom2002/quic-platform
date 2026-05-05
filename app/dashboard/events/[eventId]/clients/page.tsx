'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Mail, Phone, Trash2, UserCircle, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import type { Client } from '@/types/database'
import type { EventClientWithDetails, NotificationChannel } from '@/types/app'
import {
  loadEventClientsAction,
  addExistingClientAction,
  createAndAddClientAction,
  toggleChannelAction,
  removeClientAction,
} from './actions'

const roleLabel: Record<string, string> = {
  primary_contact: 'Contacto Principal',
  cc: 'CC',
  vip: 'VIP',
  vendor: 'Fornecedor',
}

export default function EventClientsPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId

  const [eventClients, setEventClients] = useState<EventClientWithDetails[]>([])
  const [allClients, setAllClients] = useState<Client[]>([])
  const [open, setOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  const [newClient, setNewClient] = useState({ full_name: '', email: '', phone: '', company: '' })
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedRole, setSelectedRole] = useState('primary_contact')

  useEffect(() => { loadData() }, [eventId])

  async function loadData() {
    setLoading(true)
    try {
      const { eventClients: ec, allClients: clients } = await loadEventClientsAction(eventId)
      setEventClients(ec)
      setAllClients(clients)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  function addExistingClient() {
    if (!selectedClientId) return
    startTransition(async () => {
      try {
        await addExistingClientAction(eventId, selectedClientId, selectedRole as 'primary_contact' | 'cc' | 'vip' | 'vendor')
        toast.success('Cliente adicionado ao evento')
        setAddOpen(false)
        setSelectedClientId('')
        await loadData()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      }
    })
  }

  function createAndAddClient() {
    if (!newClient.full_name) return
    startTransition(async () => {
      try {
        await createAndAddClientAction(eventId, newClient, selectedRole as 'primary_contact' | 'cc' | 'vip' | 'vendor')
        toast.success('Cliente criado e adicionado ao evento')
        setOpen(false)
        setNewClient({ full_name: '', email: '', phone: '', company: '' })
        await loadData()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      }
    })
  }

  function toggleChannel(ecId: string, channel: string, currentChannels: string[]) {
    const updated = currentChannels.includes(channel)
      ? currentChannels.filter(c => c !== channel)
      : [...currentChannels, channel]

    // Optimistic update
    setEventClients(prev => prev.map(ec =>
      ec.id === ecId ? { ...ec, notification_prefs: { channels: updated as NotificationChannel[], language: 'pt' } } : ec
    ))

    startTransition(async () => {
      try {
        await toggleChannelAction(eventId, ecId, updated)
      } catch (err: unknown) {
        // Revert optimistic update on failure
        setEventClients(prev => prev.map(ec =>
          ec.id === ecId ? { ...ec, notification_prefs: { channels: currentChannels as NotificationChannel[], language: 'pt' } } : ec
        ))
        toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      }
    })
  }

  function removeClient(ecId: string) {
    startTransition(async () => {
      try {
        await removeClientAction(eventId, ecId)
        toast.success('Cliente removido do evento')
        setEventClients(prev => prev.filter(ec => ec.id !== ecId))
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      }
    })
  }

  const availableClients = allClients.filter(c => !eventClients.some(ec => ec.client.id === c.id))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes do Evento</h1>
          <p className="text-slate-500 mt-1">Gerir contactos e preferências de notificação</p>
        </div>
        <div className="flex gap-2">
          {availableClients.length > 0 && (
            <>
              <Button variant="outline" onClick={() => setAddOpen(true)}>Adicionar existente</Button>
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="bg-white border-slate-200">
                  <DialogHeader>
                    <DialogTitle className="text-slate-900">Adicionar Cliente</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div className="space-y-1.5">
                      <Label className="text-slate-700">Cliente</Label>
                      <Select onValueChange={(val: string | null) => { if (val) setSelectedClientId(val) }}>
                        <SelectTrigger className="bg-white border-slate-200 text-slate-800">
                          <SelectValue placeholder="Selecionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableClients.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.full_name}{c.company ? ` — ${c.company}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <RoleSelector value={selectedRole} onChange={setSelectedRole} />
                    <Button onClick={addExistingClient} disabled={!selectedClientId || isPending} className="w-full">
                      Adicionar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}

          <Button onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />Novo Cliente
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="bg-white border-slate-200">
              <DialogHeader>
                <DialogTitle className="text-slate-900">Criar e Adicionar Cliente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label className="text-slate-700">Nome *</Label>
                  <Input value={newClient.full_name} onChange={e => setNewClient(p => ({ ...p, full_name: e.target.value }))}
                    placeholder="Nome completo" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700">Email</Label>
                  <Input type="email" value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))}
                    placeholder="email@exemplo.pt" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700">Telefone</Label>
                  <Input value={newClient.phone} onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+351 912 345 678" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700">Empresa</Label>
                  <Input value={newClient.company} onChange={e => setNewClient(p => ({ ...p, company: e.target.value }))}
                    placeholder="Empresa, Lda." />
                </div>
                <RoleSelector value={selectedRole} onChange={setSelectedRole} />
                <Button onClick={createAndAddClient} disabled={!newClient.full_name || isPending} className="w-full">
                  Criar e Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400">A carregar...</p>
      ) : !eventClients.length ? (
        <div className="text-center py-16">
          <UserCircle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">Nenhum cliente adicionado a este evento.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
          {eventClients.map(ec => {
            const c = ec.client
            const prefs = ec.notification_prefs ?? {}
            return (
              <div key={ec.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <span className="text-slate-500 text-sm font-medium">
                    {c.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-slate-800 font-medium">{c.full_name}</p>
                    <span className="text-xs text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded">
                      {roleLabel[ec.role] ?? ec.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-0.5">
                    {c.email && (
                      <span className="flex items-center gap-1 text-slate-400 text-xs">
                        <Mail className="w-3 h-3" />{c.email}
                      </span>
                    )}
                    {c.phone && (
                      <span className="flex items-center gap-1 text-slate-400 text-xs">
                        <Phone className="w-3 h-3" />{c.phone}
                      </span>
                    )}
                    {c.company && <span className="text-slate-300 text-xs">{c.company}</span>}
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    {[
                      { key: 'email', icon: <Mail className="w-3 h-3" />, label: 'Email', on: 'border-blue-200 bg-blue-50 text-blue-600', off: 'border-slate-200 bg-white text-slate-400' },
                      { key: 'portal', icon: <Globe className="w-3 h-3" />, label: 'Portal', on: 'border-violet-200 bg-violet-50 text-violet-600', off: 'border-slate-200 bg-white text-slate-400' },
                    ].map(({ key, icon, label, on, off }) => {
                      const channels: string[] = prefs.channels ?? ['email', 'portal']
                      const active = channels.includes(key)
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleChannel(ec.id, key, channels)}
                          disabled={isPending}
                          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition-colors ${active ? on : off}`}
                        >
                          {icon}{label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeClient(ec.id)}
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

function RoleSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-700">Papel</Label>
      <Select value={value} onValueChange={(val) => val && onChange(val)}>
        <SelectTrigger className="bg-white border-slate-200">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="primary_contact">Contacto Principal</SelectItem>
          <SelectItem value="cc">CC</SelectItem>
          <SelectItem value="vip">VIP</SelectItem>
          <SelectItem value="vendor">Fornecedor</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
