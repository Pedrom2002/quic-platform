'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createContactAction, type ContactGroup } from '@/app/dashboard/contacts/actions'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: ContactGroup[]
  onCreated: () => void
}

export function NewContactDialog({ open, onOpenChange, groups, onCreated }: Props) {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '' })
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  function reset() {
    setForm({ full_name: '', email: '', phone: '' })
    setSelectedGroups([])
  }

  function toggleGroup(id: string) {
    setSelectedGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  function submit() {
    startTransition(async () => {
      try {
        await createContactAction({ ...form, groupIds: selectedGroups })
        toast.success('Contacto criado')
        reset()
        onOpenChange(false)
        onCreated()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Novo Contacto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-zinc-400">Nome *</Label>
            <Input
              value={form.full_name}
              onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
              placeholder="Nome completo"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-400">Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
              placeholder="email@exemplo.pt"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-400">Telefone</Label>
            <Input
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
              placeholder="+351 900 000 000"
            />
          </div>

          {groups.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-zinc-400">Grupos (opcional)</Label>
              <div className="flex flex-wrap gap-2">
                {groups.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGroup(g.id)}
                    className="text-xs px-3 py-1 rounded-full border transition-colors"
                    style={
                      selectedGroups.includes(g.id)
                        ? { backgroundColor: (g.color ?? '#6366f1') + '33', color: g.color ?? '#818cf8', borderColor: g.color ?? '#6366f1' }
                        : { backgroundColor: 'transparent', color: '#71717a', borderColor: '#3f3f46' }
                    }
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={submit}
            disabled={!form.full_name.trim() || isPending}
            className="w-full"
          >
            {isPending ? 'A criar...' : 'Criar Contacto'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
