'use client'

import { useEffect, useState, useTransition } from 'react'
import { Mail, Phone, Building2, Pencil, UserMinus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Client } from '@/types/database'
import { loadClientsAction, updateClientAction, deactivateClientAction } from './actions'

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', company: '' })
  const [isPending, startTransition] = useTransition()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      setClients(await loadClientsAction())
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }

  function openEdit(client: Client) {
    setForm({
      full_name: client.full_name,
      email: client.email ?? '',
      phone: client.phone ?? '',
      company: client.company ?? '',
    })
    setEditing(client)
  }

  function saveEdit() {
    if (!editing) return
    startTransition(async () => {
      try {
        await updateClientAction(editing.id, form)
        toast.success('Cliente atualizado')
        setEditing(null)
        await load()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      }
    })
  }

  function deactivate(clientId: string) {
    if (!confirm('Desativar este cliente? Será removido do directório.')) return
    startTransition(async () => {
      try {
        await deactivateClientAction(clientId)
        toast.success('Cliente desativado')
        await load()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      }
    })
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
        <p className="text-slate-500 mt-1">{loading ? '' : `${clients.length} contactos no directório`}</p>
      </div>

      {loading ? (
        <p className="text-slate-400">A carregar...</p>
      ) : !clients.length ? (
        <div className="text-center py-20">
          <p className="text-slate-400">Nenhum cliente registado ainda.</p>
          <p className="text-slate-300 text-sm mt-1">Os clientes são criados ao adicioná-los a um evento.</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {clients.map(client => (
            <div
              key={client.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200"
            >
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <span className="text-slate-500 text-sm font-medium">
                  {client.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-800 font-medium">{client.full_name}</p>
                <div className="flex items-center gap-4 mt-0.5">
                  {client.email && (
                    <span className="flex items-center gap-1 text-slate-400 text-xs">
                      <Mail className="w-3 h-3" />{client.email}
                    </span>
                  )}
                  {client.phone && (
                    <span className="flex items-center gap-1 text-slate-400 text-xs">
                      <Phone className="w-3 h-3" />{client.phone}
                    </span>
                  )}
                  {client.company && (
                    <span className="flex items-center gap-1 text-slate-300 text-xs">
                      <Building2 className="w-3 h-3" />{client.company}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => openEdit(client)} disabled={isPending} className="text-slate-400 hover:text-slate-700">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deactivate(client.id)} disabled={isPending} className="text-slate-300 hover:text-red-500">
                  <UserMinus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={open => { if (!open) setEditing(null) }}>
        <DialogContent className="bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Editar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-slate-700">Nome *</Label>
              <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700">Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700">Telefone</Label>
              <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700">Empresa</Label>
              <Input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
            </div>
            <Button onClick={saveEdit} disabled={!form.full_name || isPending} className="w-full">
              {isPending ? 'A guardar...' : 'Guardar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
