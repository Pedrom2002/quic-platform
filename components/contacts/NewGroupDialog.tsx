'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createGroupAction } from '@/app/dashboard/contacts/actions'

const PRESET_COLORS = [
  { hex: '#6366f1', label: 'Índigo' },
  { hex: '#10b981', label: 'Verde' },
  { hex: '#f59e0b', label: 'Âmbar' },
  { hex: '#ef4444', label: 'Vermelho' },
  { hex: '#8b5cf6', label: 'Violeta' },
  { hex: '#06b6d4', label: 'Ciano' },
  { hex: '#f97316', label: 'Laranja' },
  { hex: '#ec4899', label: 'Rosa' },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  isAdmin: boolean
  onCreated: () => void
}

export function NewGroupDialog({ open, onOpenChange, isAdmin, onCreated }: Props) {
  const [form, setForm] = useState({ name: '', description: '', color: PRESET_COLORS[0].hex, admin_only: false })
  const [isPending, startTransition] = useTransition()

  function reset() {
    setForm({ name: '', description: '', color: PRESET_COLORS[0].hex, admin_only: false })
  }

  function submit() {
    startTransition(async () => {
      try {
        await createGroupAction(form)
        toast.success('Grupo criado')
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
      <DialogContent className="bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Novo Grupo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-slate-700">Nome *</Label>
            <Input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Ex: CTT, Fornecedores..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-700">Descrição</Label>
            <Input
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Opcional"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-700">Cor</Label>
            <div className="flex gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, color: c.hex }))}
                  title={c.label}
                  className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c.hex,
                    outline: form.color === c.hex ? `2px solid ${c.hex}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, admin_only: !p.admin_only }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${form.admin_only ? 'bg-amber-500' : 'bg-slate-300'}`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${form.admin_only ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
                />
              </button>
              <div>
                <Label
                  className="text-slate-700 cursor-pointer font-medium"
                  onClick={() => setForm(p => ({ ...p, admin_only: !p.admin_only }))}
                >
                  Visível apenas a admins
                </Label>
                <p className="text-xs text-slate-500 mt-0.5">Members não verão este grupo nem os seus contactos</p>
              </div>
            </div>
          )}

          <Button
            onClick={submit}
            disabled={!form.name.trim() || isPending}
            className="w-full"
          >
            {isPending ? 'A criar...' : 'Criar Grupo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
