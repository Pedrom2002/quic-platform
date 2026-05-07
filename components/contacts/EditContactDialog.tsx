'use client'

import { useState, useTransition, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  updateContactAction,
  syncContactGroupsAction,
  type ContactWithGroups,
  type ContactGroup,
} from '@/app/dashboard/contacts/actions'

interface Props {
  contact: ContactWithGroups | null
  groups: ContactGroup[]
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function EditContactDialog({ contact, groups, onOpenChange, onSaved }: Props) {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', company: '' })
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (contact) {
      setForm({
        full_name: contact.full_name,
        email: contact.email ?? '',
        phone: contact.phone ?? '',
        company: contact.company ?? '',
      })
      setSelectedGroups(contact.groups.map(g => g.id))
    }
  }, [contact])

  function toggleGroup(id: string) {
    setSelectedGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  function save() {
    if (!contact) return
    startTransition(async () => {
      try {
        await updateContactAction(contact.id, form)
        await syncContactGroupsAction(contact.id, selectedGroups)
        toast.success('Contacto atualizado')
        onOpenChange(false)
        onSaved()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      }
    })
  }

  return (
    <Dialog open={!!contact} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Editar Contacto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-slate-700">Nome *</Label>
            <Input
              value={form.full_name}
              onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-700">Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-700">Telefone</Label>
            <Input
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-700">Empresa</Label>
            <Input
              value={form.company}
              onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
            />
          </div>

          {groups.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-slate-700">Grupos</Label>
              <div className="flex flex-wrap gap-2">
                {groups.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGroup(g.id)}
                    className="text-xs px-3 py-1 rounded-full border transition-colors"
                    style={
                      selectedGroups.includes(g.id)
                        ? { backgroundColor: (g.color ?? '#6366f1') + '18', color: g.color ?? '#6366f1', borderColor: g.color ?? '#6366f1' }
                        : { backgroundColor: 'transparent', color: '#94a3b8', borderColor: '#e2e8f0' }
                    }
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={save}
            disabled={!form.full_name.trim() || isPending}
            className="w-full"
          >
            {isPending ? 'A guardar...' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
