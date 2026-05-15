'use client'

import { useState } from 'react'
import { X, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ItemWithMemberAndCounts } from '@/types/app'

type ItemWithMember = ItemWithMemberAndCounts

interface EditRowProps {
  item: ItemWithMember
  orgMembers: { id: string; full_name: string }[]
  onSave: (edits: Partial<ItemWithMember>) => void
  onCancel: () => void
  isLoading: boolean
}

export function EditRow({ item, orgMembers, onSave, onCancel, isLoading }: EditRowProps) {
  const [title, setTitle] = useState(item.title)
  const [clientLabel, setClientLabel] = useState(item.client_label ?? '')
  const [assignedTo, setAssignedTo] = useState<string>(item.assigned_to ?? '')

  function handleSave() {
    onSave({
      title,
      client_label: clientLabel || title,
      is_client_visible: true,
      assigned_to: assignedTo || null,
    })
  }

  return (
    <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-3">
      <div className="space-y-2">
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Título interno"
          className="bg-white border-slate-200 text-sm"
        />
        <Input
          value={clientLabel}
          onChange={e => setClientLabel(e.target.value)}
          placeholder="Label visível pelo cliente (ex: Palco montado)"
          className="bg-white border-slate-200 text-xs text-slate-600"
        />
        {orgMembers.length > 0 && (
          <select
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">— Sem atribuição —</option>
            {orgMembers.map(m => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={isLoading} className="h-7 px-2 text-slate-400">
          <X className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isLoading || !title.trim()} className="h-7 px-3 text-xs">
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1" />Guardar</>}
        </Button>
      </div>
    </div>
  )
}

interface NewItemRowProps {
  orgMembers: { id: string; full_name: string }[]
  isLoading: boolean
  onSave: (fields: { title: string; clientLabel: string; assignedTo: string }) => void
  onCancel: () => void
}

export function NewItemRow({ orgMembers, isLoading, onSave, onCancel }: NewItemRowProps) {
  const [title, setTitle] = useState('')
  const [clientLabel, setClientLabel] = useState('')
  const [assignedTo, setAssignedTo] = useState('')

  return (
    <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-3">
      <div className="space-y-2">
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Título interno"
          className="bg-white border-slate-200 text-sm"
          autoFocus
          onKeyDown={e => e.key === 'Escape' && onCancel()}
        />
        <Input
          value={clientLabel}
          onChange={e => setClientLabel(e.target.value)}
          placeholder="Label visível pelo cliente (ex: Palco montado)"
          className="bg-white border-slate-200 text-xs text-slate-600"
        />
        {orgMembers.length > 0 && (
          <select
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">— Sem atribuição —</option>
            {orgMembers.map(m => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={isLoading} className="h-7 px-2 text-slate-400">
          <X className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" onClick={() => onSave({ title, clientLabel, assignedTo })} disabled={isLoading || !title.trim()} className="h-7 px-3 text-xs">
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1" />Guardar</>}
        </Button>
      </div>
    </div>
  )
}
